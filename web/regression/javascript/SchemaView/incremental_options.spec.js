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

const evalOpts = (extra = {}) => {
  const { viewHelperProps: vhpExtra, ...rest } = extra;
  const schema = new OuterSchema();
  // The walker is now functional — it returns the new options tree.
  return schemaOptionsEvalulator({
    schema, data: SAMPLE_DATA, prevOptions: {},
    ...rest,
    viewHelperProps: { mode: 'create', ...(vhpExtra || {}) },
  });
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

describe('schemaOptionsEvalulator — full walk (default)', () => {
  test('without changedPath, every row is visited', () => {
    const opts = evalOpts();
    expect(visitedRowIdxs(opts)).toEqual([0, 1, 2]);
  });

  test('changedPath supplied but incrementalOptions=false, still full walk', () => {
    const opts = evalOpts({ changedPath: ['rows', 1, 'name'] });
    expect(visitedRowIdxs(opts)).toEqual([0, 1, 2]);
  });
});

describe('schemaOptionsEvalulator — incremental (viewHelperProps opt-in)', () => {
  test('changedPath inside a row visits only that row', () => {
    const opts = evalOpts({
      viewHelperProps: { incrementalOptions: true },
      changedPath: ['rows', 1, 'name'],
    });
    expect(visitedRowIdxs(opts)).toEqual([1]);
  });

  test('changedPath at the collection path visits all rows (structural)', () => {
    const opts = evalOpts({
      viewHelperProps: { incrementalOptions: true },
      changedPath: ['rows'],
    });
    expect(visitedRowIdxs(opts)).toEqual([0, 1, 2]);
  });

  test('changedPath outside the collection visits no rows', () => {
    const opts = evalOpts({
      viewHelperProps: { incrementalOptions: true },
      changedPath: ['title'],
    });
    expect(visitedRowIdxs(opts)).toEqual([]);
  });

  test('depDests force visits of rows they target even when changedPath is unrelated', () => {
    const opts = evalOpts({
      viewHelperProps: { incrementalOptions: true },
      changedPath: ['title'],
      depDests: [['rows', 2, 'val']],
    });
    expect(visitedRowIdxs(opts)).toEqual([2]);
  });

  test('union of changedPath + depDests', () => {
    const opts = evalOpts({
      viewHelperProps: { incrementalOptions: true },
      changedPath: ['rows', 0, 'name'],
      depDests: [['rows', 2, 'val']],
    });
    expect(visitedRowIdxs(opts)).toEqual([0, 2]);
  });

  test('null changedPath always falls back to full walk', () => {
    const opts = evalOpts({
      viewHelperProps: { incrementalOptions: true },
      changedPath: null,
    });
    expect(visitedRowIdxs(opts)).toEqual([0, 1, 2]);
  });
});

describe('schemaOptionsEvalulator — incremental (window global opt-in)', () => {
  afterEach(() => { window.__INCREMENTAL_OPTIONS__ = false; });

  test('window.__INCREMENTAL_OPTIONS__ activates incremental mode', () => {
    window.__INCREMENTAL_OPTIONS__ = true;
    const opts = evalOpts({ changedPath: ['rows', 1, 'name'] });
    expect(visitedRowIdxs(opts)).toEqual([1]);
  });

  test('window flag off (default) keeps full walk', () => {
    window.__INCREMENTAL_OPTIONS__ = false;
    const opts = evalOpts({ changedPath: ['rows', 1, 'name'] });
    expect(visitedRowIdxs(opts)).toEqual([0, 1, 2]);
  });
});

describe('schema.incrementalOptions opt-in via SchemaState.updateOptions', () => {
  // Build a SchemaState ready to validate. We pre-seed __lastChangedPath
  // and call validate, then inspect the resulting option store.
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
    return state;
  };

  test('schema.incrementalOptions=true enables incremental walk without viewHelperProps flag', () => {
    const state = buildState({ optedIn: true });
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...SAMPLE_DATA, __changeId: 1 });
    expect(visitedRowIdxs(state.optionStore.getState())).toEqual([1]);
  });

  test('NEGATIVE — schema without incrementalOptions runs full walk', () => {
    const state = buildState({ optedIn: false });
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...SAMPLE_DATA, __changeId: 1 });
    expect(visitedRowIdxs(state.optionStore.getState())).toEqual([0, 1, 2]);
  });

  test('viewHelperProps.incrementalOptions still works when schema does not opt in', () => {
    const state = buildState({ optedIn: false, vhpFlag: true });
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...SAMPLE_DATA, __changeId: 1 });
    expect(visitedRowIdxs(state.optionStore.getState())).toEqual([1]);
  });

  test('both flags set is idempotent (still incremental)', () => {
    const state = buildState({ optedIn: true, vhpFlag: true });
    state.__lastChangedPath = ['rows', 1, 'name'];
    state.validate({ ...SAMPLE_DATA, __changeId: 1 });
    expect(visitedRowIdxs(state.optionStore.getState())).toEqual([1]);
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
