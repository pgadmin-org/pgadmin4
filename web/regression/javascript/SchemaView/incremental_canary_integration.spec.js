/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// End-to-end integration tests for the divergence canary.
//
// The plain unit tests (incremental_canary.spec.js) call runOptionsCanary
// directly. These tests exercise the FULL production code path —
// SchemaState.validate → updateOptions → schemaOptionsEvalulator
// (wrapper) → runOptionsCanary — by setting the audit flag and observing
// the canary fire via console.error.
//
// V5 (real production code path): the canary catches a synthetic
//   cross-row read pattern when the schema is exercised via SchemaState.
//
// M4 (DepListener integration): when a schema's deps are properly
//   declared via DepListener.addDepListener, SchemaState's
//   _collectDepDestsForPath produces dest paths that pull the
//   sibling rows into mustVisit, and the canary stays clean.

import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import { SchemaState } from '../../../pgadmin/static/js/SchemaView/SchemaState';
import { _resetCanaryFireCount } from '../../../pgadmin/static/js/SchemaView/options/canary';

// Inner row schema — `note.disabled` reads sibling-row state through a
// closure on a shared data reference. Mimics real `this.top.sessData`
// access patterns in production schemas.
const makeInnerSchema = (sharedDataRef) => {
  class Inner extends BaseUISchema {
    get baseFields() {
      return [
        { id: 'name', label: 'name', type: 'text' },
        { id: 'is_pk', label: 'is_pk', type: 'switch' },
        {
          id: 'note', label: 'note', type: 'text',
          // Cross-row read via captured closure. The walker has no way
          // to know about this dep unless it's declared (M4).
          disabled: () => (sharedDataRef.rows || [])
            .some((r) => r.is_pk === true),
        },
      ];
    }
  }
  return new Inner();
};

const makeOuterSchema = (innerInstance, optedIn = true) => {
  class Outer extends BaseUISchema {
    constructor() {
      super();
      if (optedIn) this.incrementalOptions = true;
    }
    get baseFields() {
      return [
        { id: 'title', label: 'title', type: 'text' },
        {
          id: 'rows', label: 'rows', type: 'collection',
          schema: innerInstance,
          canAdd: true, canEdit: true, canDelete: true,
          mode: ['create', 'edit'],
        },
      ];
    }
  }
  return new Outer();
};

const buildData = () => ({
  title: 't',
  rows: [
    { name: 'col_a', is_pk: false, note: '' },
    { name: 'col_b', is_pk: false, note: '' },
    { name: 'col_c', is_pk: false, note: '' },
  ],
});

const buildState = (schema, sharedData) => {
  const state = new SchemaState(
    schema,
    () => Promise.resolve(sharedData),
    {},
    () => {},
    { mode: 'edit' },
  );
  state.setReady(true);
  state.data = sharedData;
  state.initData = sharedData;
  // Build initial options via a full walk so subsequent dispatches
  // have a baseline.
  state.updateOptions(null);
  return state;
};

beforeEach(() => { _resetCanaryFireCount(); });

describe('V5 — canary fires through the real SchemaState code path', () => {
  test('SchemaState.validate triggers the canary when audit flag is set', () => {
    const sharedData = buildData();
    const inner = makeInnerSchema(sharedData);
    const outer = makeOuterSchema(inner, /* optedIn = */ true);
    const state = buildState(outer, sharedData);

    // Now mutate to flip rows[1].is_pk → true. The sibling closures on
    // rows[0] and rows[2] would re-evaluate to disabled=true under the
    // full walk, but the incremental walker prunes those rows.
    sharedData.rows[1].is_pk = true;
    state.__lastChangedPath = ['rows', 1, 'is_pk'];

    window.__INCREMENTAL_AUDIT__ = true;
    window.__throw_on_canary_divergence__ = false;
    console.error.mockImplementation(() => {});
    try {
      state.validate({ ...sharedData, __changeId: 1 });
      expect(console.error).toHaveBeenCalled();
      const msg = console.error.mock.calls[0][0];
      expect(msg).toMatch(/Incremental walker divergence/);
      // The reported diff paths should point at a sibling row's `note`.
      expect(msg).toMatch(/rows\.[02]\.note/);
      console.error.mockClear();
    } finally {
      window.__INCREMENTAL_AUDIT__ = false;
    }
  });

  test('without the audit flag, SchemaState.validate runs no canary, no console.error', () => {
    const sharedData = buildData();
    const inner = makeInnerSchema(sharedData);
    const outer = makeOuterSchema(inner, /* optedIn = */ true);
    const state = buildState(outer, sharedData);

    sharedData.rows[1].is_pk = true;
    state.__lastChangedPath = ['rows', 1, 'is_pk'];

    // No __INCREMENTAL_AUDIT__ → wrapper bypasses canary. The
    // incremental walk runs (schema opted in) but no divergence is
    // reported.
    state.validate({ ...sharedData, __changeId: 1 });
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('M4 — declared deps via DepListener cover the cross-row read', () => {
  test('listeners registered for sibling-row paths produce depDests that prevent divergence', () => {
    const sharedData = buildData();
    const inner = makeInnerSchema(sharedData);
    const outer = makeOuterSchema(inner, /* optedIn = */ true);
    const state = buildState(outer, sharedData);

    // Register listeners that mirror what the schema framework would
    // produce if `note` declared `deps: [['rows', '*', 'is_pk']]`. Each
    // row's `note` field is the dest; the source is the is_pk path on
    // any row.
    //
    // DepListener's path-overlap check is prefix-based. A listener
    // with source = ['rows'] matches any changedPath starting with
    // 'rows'. We register one listener per row's `note` field so
    // _collectDepDestsForPath returns all three dests.
    sharedData.rows.forEach((_row, idx) => {
      state.addDepListener(
        ['rows'],                       // source: any change under rows
        ['rows', idx, 'note'],          // dest: this row's note field
        () => ({}),                     // sync depChange (no-op delta)
      );
    });

    sharedData.rows[1].is_pk = true;
    state.__lastChangedPath = ['rows', 1, 'is_pk'];

    window.__INCREMENTAL_AUDIT__ = true;
    window.__throw_on_canary_divergence__ = false;
    console.error.mockImplementation(() => {});
    try {
      state.validate({ ...sharedData, __changeId: 1 });
      // No divergence — the dep dests pull every row's `note` into
      // mustVisit, so the incremental walker visits the siblings and
      // re-evaluates them just like the full walk.
      expect(console.error).not.toHaveBeenCalled();
    } finally {
      window.__INCREMENTAL_AUDIT__ = false;
    }
  });
});
