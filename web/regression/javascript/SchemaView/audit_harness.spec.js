/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Tests for the per-schema audit utility (`auditSchema`). The
// utility is the unit the harness loops over: for one SchemaClass,
// it instantiates the schema, builds default sessData, then walks
// each field and dispatches a synthetic change. Both canaries
// (`runOptionsCanary` and `runValidationCanary`) run via their
// production wrappers with the audit flags on; divergence at any
// dispatch throws and the audit fails fast.
//
// Coverage in this spec is the utility's contract on synthetic
// schemas with known-good and known-bad shapes:
//   - empty fields → trivial pass
//   - simple scalar-only schema → pass
//   - undeclared cross-row read in `disabled` → throws (options canary)
//   - undeclared cross-row read in `validate` → throws (validation canary)
//   - schema with declared deps for the cross-row read → pass
//   - uninstantiable schema → returns a skip result, doesn't throw

import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import { auditSchema } from
  '../../../pgadmin/static/js/SchemaView/SchemaState/audit_harness';

beforeEach(() => {
  // Each test sets its own audit-mode expectations; reset between.
  delete window.__INCREMENTAL_AUDIT__;
  delete window.__throw_on_canary_divergence__;
  delete window.__incremental_canary_endpoint__;
  delete window.__incremental_canary_max_per_session__;
});

describe('auditSchema — empty schema', () => {
  test('schema with no fields completes without error', () => {
    class EmptySchema extends BaseUISchema {
      get baseFields() { return []; }
    }
    const result = auditSchema(EmptySchema);
    expect(result.skipped).toBe(false);
    expect(result.dispatches).toBe(0);
  });
});

describe('auditSchema — scalar-only schema', () => {
  test('schema with only scalar fields and no cross-row reads passes', () => {
    class ScalarSchema extends BaseUISchema {
      get baseFields() {
        return [
          { id: 'name', label: 'name', type: 'text' },
          { id: 'count', label: 'count', type: 'int' },
          { id: 'enabled', label: 'enabled', type: 'switch' },
        ];
      }
    }
    const result = auditSchema(ScalarSchema);
    expect(result.skipped).toBe(false);
    expect(result.dispatches).toBeGreaterThan(0);
  });
});

// Synthetic "bad" pattern driven through the harness: an inner-row
// field reads sibling-row state via `this.top.sessData.rows` — the
// real-world pattern grep'd from partition.utils.ui.js et al. The
// dependency is not declared via `field.deps`, so the incremental
// walker prunes sibling rows that should be re-evaluated. The harness
// must surface this as a canary throw.
const makeUndeclaredOptionsBad = () =>
  class OuterSchema extends BaseUISchema {
    get baseFields() {
      const InnerBad = class extends BaseUISchema {
        get baseFields() {
          return [
            { id: 'name', label: 'name', type: 'text' },
            { id: 'is_pk', label: 'is_pk', type: 'switch' },
            {
              id: 'note', label: 'note', type: 'text',
              // The cross-row read. `this` is the inner schema, so
              // `this.top` is the outer schema (wired by the walker)
              // and `this.top.sessData` is the live sessData (wired
              // by the auditor's state attachment).
              disabled: function() {
                return (this.top?.sessData?.rows || [])
                  .some((r) => r.is_pk === true);
              },
            },
          ];
        }
      };
      return [
        { id: 'title', label: 'title', type: 'text' },
        {
          id: 'rows', label: 'rows', type: 'collection',
          schema: new InnerBad(),
          canAdd: true, canEdit: true, canDelete: true,
          mode: ['create', 'edit'],
        },
      ];
    }
  };

describe('auditSchema — undeclared cross-row options read', () => {
  test('throws when a sibling-row read is undeclared', () => {
    expect(() => auditSchema(makeUndeclaredOptionsBad())).toThrow(
      /divergence/i
    );
  });
});

const makeUndeclaredValidationBad = () =>
  class OuterSchema extends BaseUISchema {
    get baseFields() {
      const InnerBad = class extends BaseUISchema {
        get baseFields() {
          return [
            { id: 'name', label: 'name', type: 'text' },
            { id: 'is_pk', label: 'is_pk', type: 'switch' },
            { id: 'note', label: 'note', type: 'text' },
          ];
        }
        // Per-row validate reads sibling-row state via the same
        // top.sessData pattern as real schemas.
        validate(state, setError) {
          if ((this.top?.sessData?.rows || [])
            .some((r) => r.is_pk === true)) {
            setError('note', 'sibling pk constraint');
            return true;
          }
          return false;
        }
      };
      return [
        { id: 'title', label: 'title', type: 'text' },
        {
          id: 'rows', label: 'rows', type: 'collection',
          schema: new InnerBad(),
          canAdd: true, canEdit: true, canDelete: true,
          mode: ['create', 'edit'],
        },
      ];
    }
  };

describe('auditSchema — undeclared cross-row validation read', () => {
  test('throws when a validator reads sibling-row state undeclared', () => {
    expect(() => auditSchema(makeUndeclaredValidationBad())).toThrow(
      /divergence/i
    );
  });
});

// ADD_ROW / DELETE_ROW dispatches set changedPath to the COLLECTION
// path. Within a single collection this forces a full re-eval (every
// row's globalPath overlaps the collection path). The remaining
// hazard is CROSS-collection reads: row N of collection B has a
// closure reading collection A, and ADD/DELETE on A leaves coll_B's
// rows pruned in incremental mode. This synthetic exercises that
// pattern.
const makeUndeclaredCrossCollectionRead = () =>
  class OuterSchema extends BaseUISchema {
    get baseFields() {
      const Inner = class extends BaseUISchema {
        get baseFields() {
          return [
            { id: 'name', label: 'name', type: 'text' },
            {
              id: 'note', label: 'note', type: 'text',
              // Reads SIBLING collection's length without declaring
              // it as a dep. seedCollections gives each collection 2
              // rows, so length starts at 2. An ADD pushes coll_a to
              // length 3 — flipping the threshold and changing every
              // coll_b row's disabled state. Full walk catches this;
              // incremental walk (mustVisit=[['coll_a']]) prunes
              // coll_b entirely.
              disabled: function() {
                return (this.top?.sessData?.coll_a || []).length >= 3;
              },
            },
          ];
        }
      };
      const inner = new Inner();
      return [
        { id: 'title', label: 'title', type: 'text' },
        {
          id: 'coll_a', label: 'coll_a', type: 'collection',
          schema: inner,
          canAdd: true, canEdit: true, canDelete: true,
          mode: ['create', 'edit'],
        },
        {
          id: 'coll_b', label: 'coll_b', type: 'collection',
          schema: inner,
          canAdd: true, canEdit: true, canDelete: true,
          mode: ['create', 'edit'],
        },
      ];
    }
  };

describe('auditSchema — ADD_ROW cross-collection divergence', () => {
  test('throws when row in coll_b reads coll_a state undeclared', () => {
    expect(() => auditSchema(makeUndeclaredCrossCollectionRead())).toThrow(
      /divergence/i
    );
  });
});

describe('auditSchema — uninstantiable schema', () => {
  test('reports skip rather than throwing', () => {
    class HardToInstantiate extends BaseUISchema {
      constructor() {
        super();
        // Unconditional throw — no fallback constructor signature
        // can rescue it. Models a schema that legitimately needs
        // its real production args (e.g. a fetch function from the
        // parent dialog) and can't be probed standalone.
        throw new Error('this schema cannot be instantiated standalone');
      }
      get baseFields() { return []; }
    }
    const result = auditSchema(HardToInstantiate);
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toMatch(/instantiate|construct/i);
  });
});
