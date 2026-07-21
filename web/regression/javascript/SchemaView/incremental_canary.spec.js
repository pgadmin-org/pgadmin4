/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Tests for the incremental-walker divergence canary. The canary runs
// schemaOptionsEvalulator twice — once with `changedPath` set
// (incremental) and once with `changedPath = null` (full walk) — sharing
// the same `prevOptions` baseline. Both calls produce independent new
// option trees; the canary diffs them.
//
// A divergence means the incremental walker skipped a row whose
// options would have changed under the full walk — i.e., the host
// schema has an undeclared cross-row closure read that mutated state
// the walker can't track.
//
// V1 (RED-then-GREEN): undeclared cross-row read → canary reports
//                      divergence.
// V2 (GREEN throughout): same shape but with deps declared → no
//                        divergence.
// V3 (GREEN throughout): empty changedPath → identity, no work.

import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import {
  runOptionsCanary, _resetCanaryFireCount,
} from '../../../pgadmin/static/js/SchemaView/options/canary';
import {
  FIELD_OPTIONS, schemaOptionsEvalulator,
} from '../../../pgadmin/static/js/SchemaView/options';

beforeEach(() => { _resetCanaryFireCount(); });

// The synthetic "bad" pattern: an evaluator closure reads SIBLING-ROW
// state via a captured `sharedData` reference, simulating
// `this.top.sessData.rows[N].X` access. The walker has no way to
// declare this as a dep (it's not field-typed), so the incremental
// walker skips sibling rows whose path doesn't overlap the changed
// path — but the full walk re-evaluates them correctly and gets a
// different answer.
const makeUndeclaredSchema = (sharedDataRef) =>
  new class OuterSchema extends BaseUISchema {
    get baseFields() {
      const Inner = class extends BaseUISchema {
        get baseFields() {
          return [
            { id: 'name', label: 'name', type: 'text' },
            { id: 'is_pk', label: 'is_pk', type: 'switch' },
            {
              id: 'note', label: 'note', type: 'text',
              // The evaluator reads sibling-row state from a captured
              // ref. Real schemas do this via `this.top.sessData.rows`
              // or via `obj.something` closures from the constructor.
              disabled: () => (sharedDataRef.rows || [])
                .some((r) => r.is_pk === true),
            },
          ];
        }
      };
      return [
        { id: 'title', label: 'title', type: 'text' },
        {
          id: 'rows', label: 'rows', type: 'collection',
          schema: new Inner(),
          canAdd: true, canEdit: true, canDelete: true,
          mode: ['create', 'edit'],
        },
      ];
    }
  };

const buildData = () => ({
  title: 't',
  rows: [
    { name: 'col_a', is_pk: false },
    { name: 'col_b', is_pk: false },
    { name: 'col_c', is_pk: false },
  ],
});

describe('runOptionsCanary — V1: undeclared cross-row read detected', () => {
  test('synthetic bad schema reports divergence when sibling pk flips', () => {
    // Shared data ref captured by evaluator closures (mimics
    // `this.top.sessData` access in real schemas).
    const sharedData = buildData();
    const schema = makeUndeclaredSchema(sharedData);

    // Initial full walk to establish prev (everything is_pk=false; all
    // notes disabled=false).
    const prev = runOptionsCanary({
      schema, data: sharedData,
      prevOptions: null,
      viewHelperProps: { mode: 'edit' },
      changedPath: null,
      depDests: null,
      onDivergence: () => {/* swallow first walk */},
    });

    // Flip rows[1].is_pk → true. Mutating sharedData simulates the
    // user typing into that field; the SchemaState dispatch would set
    // changedPath = ['rows', 1, 'is_pk']. The walker only visits
    // rows[1] under incremental mode; the closure on rows[0] and
    // rows[2] would, if re-evaluated, now return disabled=true — but
    // those rows are pruned, so their options keep the prev (false)
    // references.
    sharedData.rows[1].is_pk = true;

    const reports = [];
    runOptionsCanary({
      schema, data: sharedData,
      prevOptions: prev,
      viewHelperProps: { mode: 'edit' },
      changedPath: ['rows', 1, 'is_pk'],
      depDests: null,
      onDivergence: (r) => reports.push(r),
    });

    expect(reports.length).toBeGreaterThan(0);
    const paths = reports.flatMap((r) => r.diffs.map((d) => d.path.join('.')));
    // The divergence should be on a sibling row's `note` field —
    // rows[0] or rows[2].
    expect(paths.some((p) => p.match(/^rows\.[02]\.note$/))).toBe(true);
  });
});

describe('runOptionsCanary — V2: depDests in mustVisit prevents divergence', () => {
  test('when sibling rows are declared as depDests, no divergence', () => {
    const sharedData = buildData();
    const schema = makeUndeclaredSchema(sharedData);

    const prev = runOptionsCanary({
      schema, data: sharedData,
      prevOptions: null,
      viewHelperProps: { mode: 'edit' },
      changedPath: null,
      depDests: null,
      onDivergence: () => {},
    });

    sharedData.rows[1].is_pk = true;

    const reports = [];
    runOptionsCanary({
      schema, data: sharedData,
      prevOptions: prev,
      viewHelperProps: { mode: 'edit' },
      changedPath: ['rows', 1, 'is_pk'],
      // Simulate what SchemaState._collectDepDestsForPath would
      // produce if the schema declared deps on the sibling rows.
      // Including the sibling rows in mustVisit forces re-evaluation;
      // both walks agree.
      depDests: [['rows', 0, 'note'], ['rows', 2, 'note']],
      onDivergence: (r) => reports.push(r),
    });

    expect(reports).toEqual([]);
  });
});

describe('runOptionsCanary — V3: empty changedPath is identity', () => {
  test('no changedPath → no incremental work, no divergence reported', () => {
    const sharedData = buildData();
    const schema = makeUndeclaredSchema(sharedData);

    const reports = [];
    runOptionsCanary({
      schema, data: sharedData,
      prevOptions: null,
      viewHelperProps: { mode: 'edit' },
      changedPath: null,
      depDests: null,
      onDivergence: (r) => reports.push(r),
    });

    expect(reports).toEqual([]);
  });
});

// H1: verify the registry wrapper routes to the canary when both
// the build-time flag (set by setup-jest.js for tests) and the runtime
// flag (window.__INCREMENTAL_AUDIT__) are on. In production builds
// without CANARY_BUILD=true, the conditional is dead-code-eliminated.
describe('schemaOptionsEvalulator wrapper — H1 production wiring', () => {
  test('audit-mode flag routes the wrapper through runOptionsCanary', () => {
    const sharedData = buildData();
    const schema = makeUndeclaredSchema(sharedData);

    // First establish a baseline (no audit, no changedPath).
    const prev = schemaOptionsEvalulator({
      schema, data: sharedData, viewHelperProps: { mode: 'edit' },
      prevOptions: null,
    });

    sharedData.rows[1].is_pk = true;
    window.__INCREMENTAL_AUDIT__ = true;
    window.__throw_on_canary_divergence__ = false;

    try {
      // setup-jest.js already spies console.error globally. Set an
      // implementation to suppress output, then check + clear. DO NOT
      // mockRestore — that would unwrap setup-jest's spy and break
      // its afterEach assertion.
      console.error.mockImplementation(() => {});
      schemaOptionsEvalulator({
        schema, data: sharedData, viewHelperProps: { mode: 'edit' },
        prevOptions: prev,
        changedPath: ['rows', 1, 'is_pk'],
      });
      expect(console.error).toHaveBeenCalled();
      const msg = console.error.mock.calls[0][0];
      expect(msg).toMatch(/Incremental walker divergence/);
      // Clear the call history so setup-jest's afterEach passes.
      console.error.mockClear();
    } finally {
      window.__INCREMENTAL_AUDIT__ = false;
    }
  });

  test('without audit flag, wrapper bypasses the canary (no extra walk)', () => {
    // When __INCREMENTAL_AUDIT__ is unset, the wrapper goes straight
    // to measure() + _impl. The canary's onDivergence is never invoked.
    const sharedData = buildData();
    const schema = makeUndeclaredSchema(sharedData);

    delete window.__INCREMENTAL_AUDIT__;
    sharedData.rows[1].is_pk = true;

    // Running with incrementalOptions=true at the field level is the
    // existing prototype opt-in. The wrapper still doesn't fire the
    // canary — incremental mode runs, but no divergence is reported.
    schemaOptionsEvalulator({
      schema, data: sharedData,
      viewHelperProps: { mode: 'edit', incrementalOptions: true },
      prevOptions: null,
      changedPath: ['rows', 1, 'is_pk'],
    });
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('runOptionsCanary — throttle (H3)', () => {
  test('after MAX_CANARY_FIRES, the canary skips the incremental walk', () => {
    window.__incremental_canary_max_per_session__ = 2;
    _resetCanaryFireCount();

    const sharedData = buildData();
    const schema = makeUndeclaredSchema(sharedData);
    const prev = runOptionsCanary({
      schema, data: sharedData, viewHelperProps: { mode: 'edit' },
      prevOptions: null, changedPath: null, onDivergence: () => {},
    });
    sharedData.rows[1].is_pk = true;

    const reports = [];
    // First 2 calls with onDivergence bypass the throttle entirely.
    runOptionsCanary({
      schema, data: sharedData, viewHelperProps: { mode: 'edit' },
      prevOptions: prev, changedPath: ['rows', 1, 'is_pk'],
      onDivergence: (r) => reports.push(r),
    });
    expect(reports).toHaveLength(1);

    // Now hit the throttle limit via defaultReport path (no onDivergence).
    delete window.__incremental_canary_endpoint__;  // avoid sendBeacon
    window.__throw_on_canary_divergence__ = false;
    console.error.mockImplementation(() => {});
    try {
      // Fire enough to exceed the cap of 2. The first 2 fire the
      // throttle counter (1 → 2); the throttle takes effect on the 3rd.
      for (let i = 0; i < 5; i++) {
        runOptionsCanary({
          schema, data: sharedData, viewHelperProps: { mode: 'edit' },
          prevOptions: prev, changedPath: ['rows', 1, 'is_pk'],
        });
      }
      // Only the first 2 (cap=2) should have triggered reports.
      expect(console.error.mock.calls.length).toBeLessThanOrEqual(2);
      console.error.mockClear();
    } finally {
      delete window.__incremental_canary_max_per_session__;
    }
  });
});

describe('runOptionsCanary — returns the full-walk result authoritative', () => {
  test('caller receives the full-walk options regardless of divergence', () => {
    const sharedData = buildData();
    const schema = makeUndeclaredSchema(sharedData);

    const prev = runOptionsCanary({
      schema, data: sharedData,
      prevOptions: null,
      viewHelperProps: { mode: 'edit' },
      changedPath: null,
      depDests: null,
      onDivergence: () => {},
    });

    sharedData.rows[1].is_pk = true;

    const result = runOptionsCanary({
      schema, data: sharedData,
      prevOptions: prev,
      viewHelperProps: { mode: 'edit' },
      changedPath: ['rows', 1, 'is_pk'],
      depDests: null,
      onDivergence: () => {/* swallow */},
    });

    // Full walk's result: every row's `note.disabled` reflects
    // sharedData.rows[1].is_pk = true.
    expect(result.rows[0].note[FIELD_OPTIONS].disabled).toBe(true);
    expect(result.rows[1].note[FIELD_OPTIONS].disabled).toBe(true);
    expect(result.rows[2].note[FIELD_OPTIONS].disabled).toBe(true);
  });
});
