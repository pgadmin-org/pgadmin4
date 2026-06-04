/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Unit tests for the prototype incremental schemaOptionsEvalulator
// (and its inputs: pathOverlaps + SchemaState._collectDepDestsForPath).

import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import {
  schemaOptionsEvalulator, pathOverlaps, FIELD_OPTIONS,
} from '../../../pgadmin/static/js/SchemaView/options';
import { SchemaState } from '../../../pgadmin/static/js/SchemaView/SchemaState';
import { validateSchema } from '../../../pgadmin/static/js/SchemaView/SchemaState/common';

class InnerSchema extends BaseUISchema {
  get baseFields() {
    return [
      { id: 'name', label: 'name', type: 'text', cell: 'text' },
      { id: 'val', label: 'val', type: 'text', cell: 'text' },
    ];
  }
}

class OuterSchema extends BaseUISchema {
  get baseFields() {
    return [
      { id: 'title', label: 'title', type: 'text' },
      {
        id: 'rows', label: 'rows', type: 'collection',
        schema: new InnerSchema(),
        canAdd: true, canEdit: true, canDelete: true,
        mode: ['create', 'edit'],
      },
    ];
  }
}

const SAMPLE_DATA = {
  title: 'hi',
  rows: [
    { name: 'a', val: 'b' },
    { name: 'c', val: 'd' },
    { name: 'e', val: 'f' },
  ],
};

// Inspect the resulting options tree and return the indices of rows that
// got visited. A visited row has a `FIELD_OPTIONS` sub-key written by the
// `row` evaluator. Unvisited rows leave that slot absent. `options.rows`
// is a plain object keyed by `"0"`, `"1"`, ... plus a sibling
// `__fieldOptions` for the collection-level options.
const visitedRowIdxs = (options) => {
  const rows = options?.rows;
  if (!rows || typeof rows !== 'object') return [];
  const out = [];
  Object.keys(rows).forEach((k) => {
    if (k === FIELD_OPTIONS) return;
    const idx = Number(k);
    if (Number.isInteger(idx) && rows[k]?.[FIELD_OPTIONS]) out.push(idx);
  });
  return out.sort((a, b) => a - b);
};

// After the walker fix (registry.js: only prune when
// prevColl[idx]!==undefined), a "newly visited" row is one whose
// options entry has a NEW reference vs prev — because pruned rows
// now correctly inherit from prev (and thus have FIELD_OPTIONS via
// the spread). Compare references to detect re-evaluation; this is
// the right semantic for "incremental walked only the changed row."
const newlyVisitedRowIdxs = (next, prev) => {
  const nextRows = next?.rows || {};
  const prevRows = prev?.rows || {};
  const out = [];
  Object.keys(nextRows).forEach((k) => {
    if (k === FIELD_OPTIONS) return;
    const idx = Number(k);
    if (!Number.isInteger(idx)) return;
    if (nextRows[k] !== prevRows[k]) out.push(idx);
  });
  return out.sort((a, b) => a - b);
};

// Real-world walker invocation: a fresh dialog runs FULL walk first
// (changedPath=null) which populates prevOptions, then subsequent
// dispatches run with a concrete changedPath against the now-populated
// prev. `evalOpts` mirrors this contract so unit tests exercise the
// SECOND-walk behaviour, not a synthetic empty-prev shape that the
// production code never sees.
//
// Why: an earlier version of these tests passed `prevOptions: {}`
// directly. That hid a real walker bug — when `prevColl[idx]` is
// undefined, the incremental prune would skip the row AND leave
// nextColl[idx] undefined (no prior to inherit), producing the
// `columns.0 — incremental=undefined full={...}` divergence seen
// in Edit-mode dialogs against real data. The walker fix in
// registry.js guards the prune on `prevColl[idx] !== undefined`;
// these tests now run a warm-up full walk to populate prev so the
// guard doesn't change the assertion.
const warmUpPrev = (schema, viewHelperProps = {}) =>
  schemaOptionsEvalulator({
    schema, data: SAMPLE_DATA, prevOptions: {},
    viewHelperProps: { mode: 'create', ...viewHelperProps },
    // changedPath omitted → full walk (no incremental prune)
  });

const evalOpts = (extra = {}) => {
  const { viewHelperProps: vhpExtra, ...rest } = extra;
  const schema = new OuterSchema();
  const vhp = { mode: 'create', ...(vhpExtra || {}) };
  const prev = warmUpPrev(schema, vhp);
  // The walker is now functional — it returns the new options tree.
  const next = schemaOptionsEvalulator({
    schema, data: SAMPLE_DATA, prevOptions: prev,
    ...rest,
    viewHelperProps: vhp,
  });
  // Tag result with prev so tests that want reference-based
  // "visited this walk" semantics can pass to newlyVisitedRowIdxs.
  Object.defineProperty(next, '__prev', { value: prev, enumerable: false });
  return next;
};

describe('pathOverlaps', () => {
  test('equal paths overlap', () => {
    expect(pathOverlaps(['a','b'], ['a','b'])).toBe(true);
  });
  test('shorter is prefix of longer -> overlap', () => {
    expect(pathOverlaps(['a'], ['a','b','c'])).toBe(true);
    expect(pathOverlaps(['a','b','c'], ['a'])).toBe(true);
  });
  test('disjoint paths do not overlap', () => {
    expect(pathOverlaps(['a','b'], ['c'])).toBe(false);
    expect(pathOverlaps(['a',1], ['a',2])).toBe(false);
  });
  test('numeric vs string indices still match', () => {
    expect(pathOverlaps(['a', 0], ['a', '0'])).toBe(true);
  });
  test('empty path overlaps everything', () => {
    expect(pathOverlaps([], ['a','b'])).toBe(true);
    expect(pathOverlaps(['a'], [])).toBe(true);
  });
});

describe('schemaOptionsEvalulator — full walk fallbacks', () => {
  test('without changedPath, every row is visited (incremental needs a path)', () => {
    const opts = evalOpts();
    expect(visitedRowIdxs(opts)).toEqual([0, 1, 2]);
  });

  test('explicit incrementalOptions=false on viewHelperProps opts out, still full walk', () => {
    const opts = evalOpts({
      viewHelperProps: { incrementalOptions: false },
      changedPath: ['rows', 1, 'name'],
    });
    expect(visitedRowIdxs(opts)).toEqual([0, 1, 2]);
  });
});

describe('schemaOptionsEvalulator — incremental (viewHelperProps opt-in)', () => {
  // Assertions use newlyVisitedRowIdxs(opts, opts.__prev) — a row is
  // "newly visited" when its options entry has a different reference
  // than prev. This is the right semantic after the walker fix in
  // registry.js: pruned rows correctly inherit prev's reference (so
  // structural sharing holds), visited rows get a fresh reference.

  test('changedPath inside a row visits only that row', () => {
    const opts = evalOpts({
      viewHelperProps: { incrementalOptions: true },
      changedPath: ['rows', 1, 'name'],
    });
    expect(newlyVisitedRowIdxs(opts, opts.__prev)).toEqual([1]);
  });

  test('changedPath at the collection path visits all rows (structural)', () => {
    const opts = evalOpts({
      viewHelperProps: { incrementalOptions: true },
      changedPath: ['rows'],
    });
    expect(newlyVisitedRowIdxs(opts, opts.__prev)).toEqual([0, 1, 2]);
  });

  test('changedPath outside the collection visits no rows', () => {
    const opts = evalOpts({
      viewHelperProps: { incrementalOptions: true },
      changedPath: ['title'],
    });
    expect(newlyVisitedRowIdxs(opts, opts.__prev)).toEqual([]);
  });

  test('depDests force visits of rows they target even when changedPath is unrelated', () => {
    const opts = evalOpts({
      viewHelperProps: { incrementalOptions: true },
      changedPath: ['title'],
      depDests: [['rows', 2, 'val']],
    });
    expect(newlyVisitedRowIdxs(opts, opts.__prev)).toEqual([2]);
  });

  test('union of changedPath + depDests', () => {
    const opts = evalOpts({
      viewHelperProps: { incrementalOptions: true },
      changedPath: ['rows', 0, 'name'],
      depDests: [['rows', 2, 'val']],
    });
    expect(newlyVisitedRowIdxs(opts, opts.__prev)).toEqual([0, 2]);
  });

  test('null changedPath always falls back to full walk', () => {
    const opts = evalOpts({
      viewHelperProps: { incrementalOptions: true },
      changedPath: null,
    });
    expect(newlyVisitedRowIdxs(opts, opts.__prev)).toEqual([0, 1, 2]);
  });
});

describe('schemaOptionsEvalulator — window global escape hatch', () => {
  // The window flag is the emergency-rollback toggle now that
  // incremental is the default. Setting it to FALSE disables
  // incremental everywhere. Unset/undefined leaves the default
  // (incremental on) in effect.
  afterEach(() => { delete window.__INCREMENTAL_OPTIONS__; });

  test('window.__INCREMENTAL_OPTIONS__ unset → default-on still applies', () => {
    delete window.__INCREMENTAL_OPTIONS__;
    const opts = evalOpts({ changedPath: ['rows', 1, 'name'] });
    expect(newlyVisitedRowIdxs(opts, opts.__prev)).toEqual([1]);
  });

  test('window.__INCREMENTAL_OPTIONS__ = false disables incremental globally', () => {
    window.__INCREMENTAL_OPTIONS__ = false;
    const opts = evalOpts({ changedPath: ['rows', 1, 'name'] });
    expect(visitedRowIdxs(opts)).toEqual([0, 1, 2]);
  });
});

describe('schema.incrementalOptions opt-in via SchemaState.updateOptions', () => {
  // Build a SchemaState ready to validate. We pre-seed __lastChangedPath
  // and call validate, then inspect the resulting option store.
  //
  // The state is "warmed up" by a full-walk validate before the per-test
  // incremental dispatch: this mirrors production where the initial
  // mount populates optionStore via a no-changedPath walk BEFORE the
  // first dispatch with a concrete changedPath. Without the warm-up,
  // the test's first dispatch runs against an empty optionStore — and
  // the walker's prune-guard (registry.js: prevColl[idx]!==undefined)
  // correctly visits all rows because none have a prior result to
  // inherit. That's the right runtime behaviour but the wrong shape
  // for asserting "incremental visits only the changed row."
  const buildState = ({ optedIn, vhpFlag } = {}) => {
    class OptedInOuter extends OuterSchema {
      constructor() { super(); this.incrementalOptions = true; }
    }
    const SchemaClass = optedIn ? OptedInOuter : OuterSchema;
    const state = new SchemaState(
      new SchemaClass(),
      () => Promise.resolve(SAMPLE_DATA),
      {},
      () => {},
      { mode: 'create', ...(vhpFlag ? { incrementalOptions: true } : {}) },
    );
    state.setReady(true);
    state.data = SAMPLE_DATA;
    state.initData = SAMPLE_DATA;
    // Warm-up: full walk to populate optionStore so subsequent
    // dispatches have a real prev to prune against. Captures the
    // populated tree as `prev` on the state for the per-test helper.
    state.__lastChangedPath = null;
    state.validate({ ...SAMPLE_DATA, __changeId: 0 });
    state.__warmedPrev = state.optionStore.getState();
    return state;
  };

  test('schema.incrementalOptions=true enables incremental walk without viewHelperProps flag', () => {
    const state = buildState({ optedIn: true });
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...SAMPLE_DATA, __changeId: 1 });
    expect(newlyVisitedRowIdxs(
      state.optionStore.getState(), state.__warmedPrev
    )).toEqual([1]);
  });

  test('schema.incrementalOptions=false opts out (full walk despite default-on)', () => {
    class OptedOutOuter extends OuterSchema {
      constructor() { super(); this.incrementalOptions = false; }
    }
    const state = new SchemaState(
      new OptedOutOuter(),
      () => Promise.resolve(SAMPLE_DATA),
      {},
      () => {},
      { mode: 'create' },
    );
    state.setReady(true);
    state.data = SAMPLE_DATA;
    state.initData = SAMPLE_DATA;
    // Warm-up + capture prev so the assertion compares against a
    // populated baseline (matching the opted-in tests above).
    state.__lastChangedPath = null;
    state.validate({ ...SAMPLE_DATA, __changeId: 0 });
    const warmedPrev = state.optionStore.getState();
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...SAMPLE_DATA, __changeId: 1 });
    // Opt-out: walker is full → ALL rows get fresh references on each
    // dispatch (no structural sharing).
    expect(newlyVisitedRowIdxs(
      state.optionStore.getState(), warmedPrev
    )).toEqual([0, 1, 2]);
  });

  test('schema without any incrementalOptions setting uses default-on', () => {
    const state = buildState({ optedIn: false });
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...SAMPLE_DATA, __changeId: 1 });
    // Default-on: incremental triggers when changedPath is present and
    // no opt-out is set. Only the changed row is re-evaluated.
    expect(newlyVisitedRowIdxs(
      state.optionStore.getState(), state.__warmedPrev
    )).toEqual([1]);
  });

  test('viewHelperProps.incrementalOptions still works when schema does not opt in', () => {
    const state = buildState({ optedIn: false, vhpFlag: true });
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...SAMPLE_DATA, __changeId: 1 });
    expect(newlyVisitedRowIdxs(
      state.optionStore.getState(), state.__warmedPrev
    )).toEqual([1]);
  });

  test('both flags set is idempotent (still incremental)', () => {
    const state = buildState({ optedIn: true, vhpFlag: true });
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...SAMPLE_DATA, __changeId: 1 });
    expect(newlyVisitedRowIdxs(
      state.optionStore.getState(), state.__warmedPrev
    )).toEqual([1]);
  });
});

describe('SchemaState.validate — incremental validateSchema integration', () => {
  // Row schema whose custom validate() records the rows actually walked.
  class CountingInner extends BaseUISchema {
    get baseFields() {
      return [{ id: 'name', type: 'text', cell: 'text' }];
    }
    validate(state) { CountingInner.visits.push(state.name); return false; }
  }
  CountingInner.visits = [];

  class CountingOuter extends BaseUISchema {
    constructor() { super(); this.incrementalOptions = true; }
    get baseFields() {
      return [{
        id: 'rows', type: 'collection', schema: new CountingInner(),
        mode: ['create', 'edit'],
      }];
    }
  }

  const data3 = { rows: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] };

  const buildReady = () => {
    const state = new SchemaState(
      new CountingOuter(),
      () => Promise.resolve(data3),
      {},
      () => {},
      { mode: 'edit' },
    );
    state.setReady(true);
    state.data = data3;
    state.initData = data3;
    return state;
  };

  beforeEach(() => { CountingInner.visits = []; });

  test('schema.incrementalOptions=true narrows validateSchema to the changed row', () => {
    const state = buildReady();
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...data3, __changeId: 1 });
    expect(CountingInner.visits).toEqual(['b']);
  });

  test('NEGATIVE — without opt-in, validateSchema walks every row', () => {
    class NoOptOuter extends CountingOuter {
      constructor() { super(); this.incrementalOptions = false; }
    }
    const state = new SchemaState(
      new NoOptOuter(),
      () => Promise.resolve(data3),
      {},
      () => {},
      { mode: 'edit' },
    );
    state.setReady(true);
    state.data = data3;
    state.initData = data3;
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...data3, __changeId: 1 });
    expect(CountingInner.visits).toEqual(['a', 'b', 'c']);
  });

  test('mustVisit includes current error path so the erroring row is re-validated', () => {
    const state = buildReady();
    // Seed a pre-existing error on row 2.
    state.setError({ name: ['rows', 2, 'name'], message: 'stale' });
    // User types in row 0 (unrelated).
    state.__lastChangedPath = ['rows', 0, 'name'];
    state.validate({ ...data3, __changeId: 2 });
    // Row 0 (changedPath) and row 2 (current error path) both walked.
    expect(CountingInner.visits.sort()).toEqual(['a', 'c']);
  });
});

describe('updateOptions — structural sharing of unvisited subtrees', () => {
  // Same schema shape as the OuterSchema fixture but with the schema
  // opting into incrementalOptions so a SchemaState built from it does
  // incremental walks.
  class OptedOuter extends OuterSchema {
    constructor() { super(); this.incrementalOptions = true; }
  }

  const newReadyState = () => {
    const state = new SchemaState(
      new OptedOuter(),
      () => Promise.resolve(SAMPLE_DATA),
      {},
      () => {},
      { mode: 'edit' },
    );
    state.setReady(true);
    state.data = SAMPLE_DATA;
    state.initData = SAMPLE_DATA;
    return state;
  };

  test('unvisited row option subtrees share reference (Object.is) with previous options', () => {
    const state = newReadyState();
    // Full initial walk populates the option tree.
    state.validate({ ...SAMPLE_DATA, __changeId: 1 });
    const prev = state.optionStore.getState();

    // Incremental walk targeting row 1.
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...SAMPLE_DATA, __changeId: 2 });
    const next = state.optionStore.getState();

    // Rows 0 and 2 weren't touched — their option subtrees must be
    // exactly the same object references as in `prev`.
    expect(next.rows[0]).toBe(prev.rows[0]);
    expect(next.rows[2]).toBe(prev.rows[2]);
  });

  test('visited row subtree is a NEW reference (the walker did re-evaluate it)', () => {
    const state = newReadyState();
    state.validate({ ...SAMPLE_DATA, __changeId: 1 });
    const prev = state.optionStore.getState();
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...SAMPLE_DATA, __changeId: 2 });
    const next = state.optionStore.getState();

    expect(next.rows[1]).not.toBe(prev.rows[1]);
  });

  test('full walk (changedPath=undefined) gives fresh references everywhere — sanity', () => {
    const state = newReadyState();
    state.validate({ ...SAMPLE_DATA, __changeId: 1 });
    const prev = state.optionStore.getState();
    state.__lastChangedPath = undefined;  // forces full walk
    state.validate({ ...SAMPLE_DATA, __changeId: 2 });
    const next = state.optionStore.getState();

    // Full walk re-builds everything; references diverge.
    expect(next.rows[0]).not.toBe(prev.rows[0]);
    expect(next.rows[2]).not.toBe(prev.rows[2]);
  });
});

describe('SchemaState._collectDepDestsForPath', () => {
  const newState = () => new SchemaState(
    new OuterSchema(),
    () => Promise.resolve({}),
    {},
    () => {},
    { mode: 'create' },
  );

  test('null when no listeners are registered', () => {
    expect(newState()._collectDepDestsForPath(['x'])).toEqual(null);
  });

  test('null when changedPath is not an array', () => {
    const state = newState();
    state.addDepListener(['x'], ['y']);
    expect(state._collectDepDestsForPath(null)).toEqual(null);
    expect(state._collectDepDestsForPath(undefined)).toEqual(null);
  });

  test('exact source/changedPath match -> dest collected', () => {
    const state = newState();
    state.addDepListener(['rows', 0, 'name'], ['rows', 5, 'val']);
    expect(state._collectDepDestsForPath(['rows', 0, 'name']))
      .toEqual([['rows', 5, 'val']]);
  });

  test('source is prefix of changedPath -> match', () => {
    const state = newState();
    state.addDepListener(['rows'], ['title']);
    expect(state._collectDepDestsForPath(['rows', 2, 'name']))
      .toEqual([['title']]);
  });

  test('changedPath is prefix of source -> match (structural change above)', () => {
    const state = newState();
    state.addDepListener(['rows', 2, 'name'], ['title']);
    expect(state._collectDepDestsForPath(['rows']))
      .toEqual([['title']]);
  });

  test('disjoint source/changedPath -> empty', () => {
    const state = newState();
    state.addDepListener(['x'], ['y']);
    expect(state._collectDepDestsForPath(['z'])).toEqual([]);
  });

  test('multiple listeners — only matching ones contribute', () => {
    const state = newState();
    state.addDepListener(['a'], ['da']);
    state.addDepListener(['a', 'b'], ['dab']);
    state.addDepListener(['c'], ['dc']);
    expect(state._collectDepDestsForPath(['a', 'b']))
      .toEqual([['da'], ['dab']]);
  });
});

describe('validateSchema — incremental mustVisit pruning', () => {
  // A row schema that records every call to its custom validate() so we
  // can count which rows were visited.
  class CountingInnerSchema extends BaseUISchema {
    get baseFields() {
      return [{ id: 'name', type: 'text', cell: 'text' }];
    }
    validate(state) {
      CountingInnerSchema.visits.push(state.name);
      return false;
    }
  }
  CountingInnerSchema.visits = [];

  class CountingOuterSchema extends BaseUISchema {
    get baseFields() {
      return [{
        id: 'rows', type: 'collection', schema: new CountingInnerSchema(),
        mode: ['create', 'edit'],
      }];
    }
  }

  const DATA = {
    rows: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
  };

  beforeEach(() => { CountingInnerSchema.visits = []; });

  test('null mustVisit (default) validates every row', () => {
    validateSchema(new CountingOuterSchema(), DATA, () => {}, [], null);
    expect(CountingInnerSchema.visits).toEqual(['a', 'b', 'c']);
  });

  test('mustVisit pointing into one row validates only that row', () => {
    validateSchema(
      new CountingOuterSchema(), DATA, () => {}, [], null,
      [['rows', 1, 'name']],
    );
    expect(CountingInnerSchema.visits).toEqual(['b']);
  });

  test('mustVisit at the collection path validates all rows (structural)', () => {
    validateSchema(
      new CountingOuterSchema(), DATA, () => {}, [], null,
      [['rows']],
    );
    expect(CountingInnerSchema.visits).toEqual(['a', 'b', 'c']);
  });

  test('mustVisit outside the collection validates no rows', () => {
    validateSchema(
      new CountingOuterSchema(), DATA, () => {}, [], null,
      [['title']],
    );
    expect(CountingInnerSchema.visits).toEqual([]);
  });

  test('mustVisit with multiple paths unions rows', () => {
    validateSchema(
      new CountingOuterSchema(), DATA, () => {}, [], null,
      [['rows', 0, 'name'], ['rows', 2, 'name']],
    );
    expect(CountingInnerSchema.visits).toEqual(['a', 'c']);
  });
});

describe('validateCollectionSchema — checkUniqueCol pruning', () => {
  // Outer collection with uniqueCol = ['name']. Data has a duplicate
  // name across rows 0 and 1.
  class UCInner extends BaseUISchema {
    get baseFields() {
      return [
        { id: 'name', type: 'text', cell: 'text' },
        { id: 'value', type: 'text', cell: 'text' },
      ];
    }
  }
  class UCOuter extends BaseUISchema {
    get baseFields() {
      return [{
        id: 'rows', type: 'collection', schema: new UCInner(),
        uniqueCol: ['name'], mode: ['create', 'edit'],
      }];
    }
  }
  const DATA = { rows: [
    { name: 'dup', value: '1' },
    { name: 'dup', value: '2' },
    { name: 'unique', value: '3' },
  ]};

  const runValidate = (mustVisit) => {
    const errors = [];
    validateSchema(
      new UCOuter(), DATA,
      (path, msg) => errors.push({path, msg}),
      [], null, mustVisit,
    );
    return errors;
  };

  const hasUniqueError = (errors) =>
    errors.some(e => /must be unique/.test(e.msg));

  test('full walk (mustVisit=null) detects the duplicate', () => {
    expect(hasUniqueError(runValidate(null))).toBe(true);
  });

  test('mustVisit at the collection path (ADD/DELETE) runs checkUniqueCol', () => {
    expect(hasUniqueError(runValidate([['rows']]))).toBe(true);
  });

  test('mustVisit on a uniqueCol field (name) runs checkUniqueCol', () => {
    expect(hasUniqueError(runValidate([['rows', 1, 'name']]))).toBe(true);
  });

  test('NEGATIVE — mustVisit on a NON-uniqueCol field skips checkUniqueCol', () => {
    expect(hasUniqueError(runValidate([['rows', 1, 'value']]))).toBe(false);
  });

  test('NEGATIVE — a deep path inside a nested-collection row does not trigger outer uniqueCol', () => {
    // Outer collection's uniqueCol is ['name']. A change deep inside a
    // hypothetical nested collection has a path of length > currPath+2,
    // so it must NOT satisfy the outer collection's uniqueness trigger.
    expect(hasUniqueError(
      runValidate([['rows', 0, 'nested', 0, 'name']])
    )).toBe(false);
  });

  test('mustVisit with no uniqueCol-relevant path skips even when the row was visited', () => {
    // Row 1 is in mustVisit (for some other reason — say a depDest),
    // but the path is 'value', not 'name'. Row 1's per-field validators
    // run (no error); uniqueCol scan should be skipped.
    expect(hasUniqueError(runValidate([['rows', 1, 'value']]))).toBe(false);
  });
});

describe('SchemaState.validate consumes __lastChangedPath', () => {
  // Build a SchemaState whose validate() runs successfully. We pre-seed
  // __lastChangedPath, call validate, and assert it was consumed.
  const newReadyState = async () => {
    const state = new SchemaState(
      new OuterSchema(),
      () => Promise.resolve(SAMPLE_DATA),
      {},
      () => {},
      { mode: 'edit' },
    );
    // Simulate the post-initialise ready state without a React reducer.
    state.setReady(true);
    state.data = SAMPLE_DATA;
    state.initData = SAMPLE_DATA;
    return state;
  };

  test('consumes (clears) __lastChangedPath after validate', async () => {
    const state = await newReadyState();
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...SAMPLE_DATA, __changeId: 1 });
    expect(state.__lastChangedPath).toBeUndefined();
  });

  test('validate is callable with no __lastChangedPath set', async () => {
    const state = await newReadyState();
    expect(() => state.validate({ ...SAMPLE_DATA, __changeId: 1 }))
      .not.toThrow();
    expect(state.__lastChangedPath).toBeUndefined();
  });
});
