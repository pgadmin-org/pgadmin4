/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Tests for the incremental-validator divergence canary. Mirrors the
// options canary pattern: runs validateSchema twice — once with the
// production `mustVisit` array (incremental) and once with
// `mustVisit=null` (full walk) — and diffs the error maps produced by
// each. Any path with a different error message (or present in one walk
// but not the other) is a divergence.
//
// A divergence means the incremental walker skipped a row whose
// validator would have set (or cleared) an error under the full walk —
// i.e., the host schema has a cross-row read in `validate()` that
// wasn't declared via `field.deps`.
//
// V1 (RED-then-GREEN): undeclared cross-row read in validator → canary
//                      reports divergence.
// V2 (GREEN throughout): same schema with cross-row dest paths in
//                        mustVisit → no divergence.
// V3 (GREEN throughout): mustVisit=null → identity, no work.
// H1/H2: validateSchema wrapper routes through canary iff
//        __INCREMENTAL_AUDIT__ is on.
// throttle: after MAX_CANARY_FIRES, the canary skips the incremental walk.
// authoritative: caller receives the full walk's hadError result.

import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import {
  runValidationCanary, _resetValidationCanaryFireCount,
} from '../../../pgadmin/static/js/SchemaView/SchemaState/validation_canary';
import {
  validateSchema,
} from '../../../pgadmin/static/js/SchemaView/SchemaState/common';

beforeEach(() => { _resetValidationCanaryFireCount(); });

// The synthetic "bad" pattern: the inner schema's `validate()` reads
// SIBLING-ROW state via a captured `sharedDataRef` (mimics
// `this.top.sessData.rows[N].X` in real schemas). If ANY row has
// is_pk=true, every row's validator errors. The walker has no way to
// declare this as a dep (it's not field-typed), so the incremental
// walker only visits rows on the changedPath — sibling rows are pruned
// and their validators never fire.
const makeUndeclaredValidationSchema = (sharedDataRef) =>
  new (class OuterSchema extends BaseUISchema {
    get baseFields() {
      const Inner = class extends BaseUISchema {
        get baseFields() {
          return [
            { id: 'name', label: 'name', type: 'text' },
            { id: 'is_pk', label: 'is_pk', type: 'switch' },
            { id: 'note', label: 'note', type: 'text' },
          ];
        }

        // Per-row validate reads sibling state from the closure-captured
        // ref. Setting an error returns true (per BaseUISchema contract).
        validate(state, setError) {
          if ((sharedDataRef.rows || []).some((r) => r.is_pk === true)) {
            setError('note', 'sibling pk constraint violated');
            return true;
          }
          return false;
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
  })();

const buildData = () => ({
  title: 't',
  rows: [
    { name: 'col_a', is_pk: false },
    { name: 'col_b', is_pk: false },
    { name: 'col_c', is_pk: false },
  ],
});

describe('runValidationCanary — V1: undeclared cross-row read detected', () => {
  test('synthetic bad schema reports divergence when sibling pk flips', () => {
    const sharedData = buildData();
    const schema = makeUndeclaredValidationSchema(sharedData);

    // Flip rows[1].is_pk → true. SchemaState dispatch would set
    // changedPath = ['rows', 1, 'is_pk'] and mustVisit = [changedPath].
    // The full walk visits rows[0] first, hits the cross-row validator,
    // sets an error on rows[0].note. The incremental walk only visits
    // rows[1], setting the same error on rows[1].note. Different paths
    // → divergence.
    sharedData.rows[1].is_pk = true;

    const reports = [];
    runValidationCanary({
      schema, sessData: sharedData,
      setError: () => {/* swallow */},
      accessPath: [], collLabel: null,
      mustVisit: [['rows', 1, 'is_pk']],
      onDivergence: (r) => reports.push(r),
    });

    expect(reports.length).toBeGreaterThan(0);
    const paths = reports.flatMap((r) => r.diffs.map((d) => d.path.join('.')));
    // Both walks set an error, but on different row paths — full hits
    // rows.0.note first, incremental hits rows.1.note. The diff should
    // surface at least one of those.
    expect(paths.some((p) => p.match(/^rows\.[012]\.note$/))).toBe(true);
  });
});

describe('runValidationCanary — V2: mustVisit covering siblings prevents divergence', () => {
  test('when sibling rows are in mustVisit, no divergence', () => {
    const sharedData = buildData();
    const schema = makeUndeclaredValidationSchema(sharedData);

    sharedData.rows[1].is_pk = true;

    const reports = [];
    runValidationCanary({
      schema, sessData: sharedData,
      setError: () => {},
      accessPath: [], collLabel: null,
      // Simulate what _collectDepDestsForPath would produce if the
      // schema declared deps on the sibling rows: every row appears in
      // mustVisit, so the incremental walker visits all of them and
      // matches the full walk's first-error short-circuit.
      mustVisit: [
        ['rows', 0],
        ['rows', 1, 'is_pk'],
        ['rows', 2],
      ],
      onDivergence: (r) => reports.push(r),
    });

    expect(reports).toEqual([]);
  });
});

describe('runValidationCanary — V3: mustVisit=null is identity', () => {
  test('null mustVisit → no incremental work, no divergence reported', () => {
    const sharedData = buildData();
    const schema = makeUndeclaredValidationSchema(sharedData);

    sharedData.rows[1].is_pk = true;

    const reports = [];
    runValidationCanary({
      schema, sessData: sharedData,
      setError: () => {},
      accessPath: [], collLabel: null,
      mustVisit: null,
      onDivergence: (r) => reports.push(r),
    });

    expect(reports).toEqual([]);
  });
});

// H1: the wrapper inside validateSchema must route through the canary
// when both the build-time flag (set by setup-jest.js for tests) and
// the runtime flag (window.__INCREMENTAL_AUDIT__) are on. In production
// builds without CANARY_BUILD=true, the conditional is DCE'd.
describe('validateSchema wrapper — H1 production wiring', () => {
  test('audit-mode flag routes the wrapper through the canary', () => {
    const sharedData = buildData();
    const schema = makeUndeclaredValidationSchema(sharedData);

    sharedData.rows[1].is_pk = true;
    window.__INCREMENTAL_AUDIT__ = true;
    window.__throw_on_canary_divergence__ = false;

    try {
      // setup-jest.js already spies console.error globally. Set an
      // implementation to suppress output, then check + clear. DO NOT
      // mockRestore — would unwrap setup-jest's spy.
      console.error.mockImplementation(() => {});
      validateSchema(
        schema, sharedData,
        () => {/* setError */},
        [], null,
        [['rows', 1, 'is_pk']],
      );
      expect(console.error).toHaveBeenCalled();
      const msg = console.error.mock.calls[0][0];
      expect(msg).toMatch(/Incremental validator divergence/);
      console.error.mockClear();
    } finally {
      window.__INCREMENTAL_AUDIT__ = false;
    }
  });

  test('without audit flag, wrapper bypasses the canary (no extra walk)', () => {
    const sharedData = buildData();
    const schema = makeUndeclaredValidationSchema(sharedData);

    delete window.__INCREMENTAL_AUDIT__;
    sharedData.rows[1].is_pk = true;

    validateSchema(
      schema, sharedData,
      () => {/* setError */},
      [], null,
      [['rows', 1, 'is_pk']],
    );
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('runValidationCanary — throttle', () => {
  test('after MAX_CANARY_FIRES, the canary skips the incremental walk', () => {
    window.__incremental_canary_max_per_session__ = 2;
    _resetValidationCanaryFireCount();

    const sharedData = buildData();
    const schema = makeUndeclaredValidationSchema(sharedData);
    sharedData.rows[1].is_pk = true;

    const reports = [];
    // First call with onDivergence bypasses the throttle entirely.
    runValidationCanary({
      schema, sessData: sharedData, setError: () => {},
      accessPath: [], collLabel: null,
      mustVisit: [['rows', 1, 'is_pk']],
      onDivergence: (r) => reports.push(r),
    });
    expect(reports).toHaveLength(1);

    delete window.__incremental_canary_endpoint__;  // avoid sendBeacon
    window.__throw_on_canary_divergence__ = false;
    console.error.mockImplementation(() => {});
    try {
      // Fire enough to exceed the cap. First 2 trip the throttle
      // counter (1 → 2); the throttle takes effect from the 3rd onward.
      for (let i = 0; i < 5; i++) {
        runValidationCanary({
          schema, sessData: sharedData, setError: () => {},
          accessPath: [], collLabel: null,
          mustVisit: [['rows', 1, 'is_pk']],
        });
      }
      expect(console.error.mock.calls.length).toBeLessThanOrEqual(2);
      console.error.mockClear();
    } finally {
      delete window.__incremental_canary_max_per_session__;
    }
  });
});

describe('runValidationCanary — returns the full-walk hadError', () => {
  test('caller receives the full-walk hadError + errors via setError', () => {
    const sharedData = buildData();
    const schema = makeUndeclaredValidationSchema(sharedData);

    sharedData.rows[1].is_pk = true;

    const captured = [];
    const hadError = runValidationCanary({
      schema, sessData: sharedData,
      setError: (path, message) => { captured.push({ path, message }); },
      accessPath: [], collLabel: null,
      mustVisit: [['rows', 1, 'is_pk']],
      onDivergence: () => {/* swallow */},
    });

    // Full walk visits all rows in order; rows[0] hits the error first
    // (sibling pk read) and short-circuits. The caller's setError gets
    // the FULL walk's error on rows.0.note — not the incremental
    // walk's rows.1.note.
    expect(hadError).toBe(true);
    expect(captured).toHaveLength(1);
    expect(captured[0].path).toEqual(['rows', 0, 'note']);
    expect(captured[0].message).toMatch(/sibling pk/);
  });
});
