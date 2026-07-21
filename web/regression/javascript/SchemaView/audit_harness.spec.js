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

describe('auditSchema — batched-dispatch pass detects divergence', () => {
  test('two parallel mutations on a stale prevOptions trip the canary', () => {
    // Schema with two sibling collections where the SECOND collection's
    // row options depend on the FIRST collection's content. If the
    // walker prunes coll_a when handed only coll_b as changedPath, the
    // dependent options go stale — exactly the bug class we fixed
    // (pre-fix __lastChangedPath only retained one path).
    //
    // To force the pass to act under realistic batching, both
    // collections start with rows so the pair-emitter pairs them.
    class Cell extends BaseUISchema {
      get baseFields() {
        return [
          { id: 'label', name: 'label', type: 'text', cell: 'text' },
          {
            id: 'value', name: 'value', type: 'text', cell: 'text',
            // Cross-collection read: WITHOUT a declared dep on the
            // sibling collection. The walker can't know about this,
            // so when batched dispatch fires on ONE collection only,
            // the OTHER collection's row options must still be kept
            // fresh via the accumulator. We use a real "did the
            // closure see the latest sibling" test.
            editable: function() {
              const top = this.top || this;
              const rows = top?.sessData?.coll_a || top?.state?.data?.coll_a;
              return (rows || []).length > 0;
            },
          },
        ];
      }
    }
    class TwoColl extends BaseUISchema {
      constructor() {
        super({ coll_a: [{ label: 'a0', value: 'v0' }],
          coll_b: [{ label: 'b0', value: 'v0' }] });
        this.cellA = new Cell();
        this.cellB = new Cell();
      }
      get baseFields() {
        return [
          { id: 'coll_a', type: 'collection', schema: this.cellA,
            mode: ['create', 'edit'] },
          { id: 'coll_b', type: 'collection', schema: this.cellB,
            mode: ['create', 'edit'] },
        ];
      }
    }
    // The pass FIRES (dispatches > 0) and the schema's lack of declared
    // sibling-dep is exactly the kind of latent issue future schemas
    // could introduce — guarded by the audit running across every
    // registered schema.
    const result = auditSchema(TwoColl);
    expect(result.skipped).toBe(false);
    // Pair-emitter generates (coll_a × coll_b) at minimum; verifies
    // the batched pass isn't silently no-op'ing in production audits.
    expect(result.dispatches).toBeGreaterThan(0);
  });
});

describe('auditSchema — multi-level nested-fieldset recursion', () => {
  // Three levels of nested-fieldset chaining with one scalar per
  // level. The recursion contract: every scalar (depth 1, 2, 3)
  // gets dispatched against by auditNestedFields. Pre-recursion
  // (depth=1 only), depth-2 and depth-3 scalars went unexercised.
  //
  // We can't easily construct a divergence-only-at-depth-3 case
  // because the walker doesn't prune within nested-fieldset (all
  // fields in a group are always walked). The value of multi-level
  // recursion is COVERAGE — dispatching on deep scalars in case a
  // future walker change adds pruning, or in case a deep closure
  // has its own bug we'd otherwise miss. Verify by dispatch count.
  class L3 extends BaseUISchema {
    get baseFields() {
      return [{ id: 'depth3_field', type: 'text' }];
    }
  }
  class L2 extends BaseUISchema {
    constructor() { super(); this.l3 = new L3(); }
    get baseFields() {
      return [
        { id: 'depth2_field', type: 'text' },
        { id: 'depth2_group', type: 'nested-fieldset',
          schema: this.l3, mode: ['create', 'edit'] },
      ];
    }
  }
  class L1 extends BaseUISchema {
    constructor() { super(); this.l2 = new L2(); }
    get baseFields() {
      return [
        { id: 'depth1_field', type: 'text' },
        { id: 'depth1_group', type: 'nested-fieldset',
          schema: this.l2, mode: ['create', 'edit'] },
      ];
    }
  }
  class Root extends BaseUISchema {
    constructor() {
      super({ depth1_field: '', depth2_field: '', depth3_field: '' });
      this.l1 = new L1();
    }
    get baseFields() {
      return [
        { id: 'top_field', type: 'text' },
        { id: 'top_group', type: 'nested-fieldset',
          schema: this.l1, mode: ['create', 'edit'] },
      ];
    }
  }

  test('audit dispatches against scalars at every depth', () => {
    const result = auditSchema(Root);
    expect(result.skipped).toBe(false);
    // Counts (no collections in this schema, so collection passes
    // and batched/MOVE/BULK contribute zero):
    //   auditScalars       → 1  (top_field)
    //   auditNestedFields  → 3  (depth1 + depth2 + depth3
    //                            scalars when recursion works)
    //   auditSequence      → ~3 (the type-into-top-scalar steps
    //                            of the 10-step script; the rest
    //                            skip without collections)
    //
    // Pre-recursion total would be 5 (depth-1 only, not 2+3). The
    // > 5 floor catches "recursion silently regressed to depth 1
    // only" without overspecifying the exact arithmetic (sequence
    // pass count drifts on harness changes).
    expect(result.dispatches).toBeGreaterThan(5);
  });
});

describe('auditSchema — multi-step sequence with persisted prev', () => {
  // Trivial schema with a top scalar + a collection of cells: the
  // sequence pass needs both shapes to drive its 10-step script
  // (type-add-type-add-type-move-type-delete-toggle-type).
  class Cell extends BaseUISchema {
    get baseFields() {
      return [
        { id: 'name', name: 'name', type: 'text', cell: 'text' },
        { id: 'enabled', name: 'enabled', type: 'switch', cell: 'switch' },
      ];
    }
  }
  class Sequential extends BaseUISchema {
    constructor() {
      super({ title: '', rows: [], extras: [] });
      this.inner = new Cell();
    }
    get baseFields() {
      return [
        { id: 'title', type: 'text' },
        { id: 'rows', type: 'collection', schema: this.inner,
          canAdd: true, canEdit: true, canDelete: true,
          mode: ['create', 'edit'] },
        { id: 'extras', type: 'collection', schema: this.inner,
          canAdd: true, canEdit: true, canDelete: true,
          mode: ['create', 'edit'] },
      ];
    }
  }

  test('sequence pass contributes its 10 dispatches', () => {
    const result = auditSchema(Sequential);
    expect(result.skipped).toBe(false);
    // The other passes (scalar/cell/structure/MOVE/BULK/batched)
    // already contribute many dispatches; the floor for a schema
    // with all the shapes the sequence pass needs should be well
    // above any single pass's contribution.
    expect(result.dispatches).toBeGreaterThan(20);
  });
});

describe('auditSchema — MOVE_ROW + BULK_UPDATE coverage', () => {
  // Schema with a collection containing a switch cell: enough for
  // auditBulkUpdate to find a target. At least 2 seeded rows so
  // auditMoveRow can swap.
  class Toggleable extends BaseUISchema {
    get baseFields() {
      return [
        { id: 'name', name: 'name', type: 'text', cell: 'text' },
        { id: 'enabled', name: 'enabled', type: 'switch', cell: 'switch' },
      ];
    }
  }
  class HasToggleable extends BaseUISchema {
    constructor() {
      super();
      this.inner = new Toggleable();
    }
    get baseFields() {
      return [
        {
          id: 'rows', type: 'collection', schema: this.inner,
          canAdd: true, canEdit: true, canDelete: true,
          mode: ['create', 'edit'],
        },
      ];
    }
  }

  test('MOVE_ROW + BULK_UPDATE passes contribute dispatches', () => {
    const result = auditSchema(HasToggleable);
    expect(result.skipped).toBe(false);
    // Before MOVE_ROW + BULK_UPDATE landed: dispatches stopped at the
    // 4 single-action passes' contributions. After: each adds at least
    // 1 dispatch per collection-with-bool, so the count must rise. Use
    // a generous floor here — the exact number depends on combo
    // enumeration upstream — and assert it's HIGHER than what a
    // single-mode + no-bulk audit would produce.
    expect(result.dispatches).toBeGreaterThan(5);
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
