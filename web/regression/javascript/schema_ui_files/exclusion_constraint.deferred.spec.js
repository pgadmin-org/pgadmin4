/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Characterization + contract tests for the amname deferredDepChange
// on ExclusionConstraintSchema. Reachable paths:
//   1) amname unchanged                                    -> no-op (new)
//   2) amname changed, columns empty                       -> no-op (new)
//   3) amname changed -> btree, user confirms              -> exColumnSchema
//      gets btree operClass options + sort defaults,
//      delta {columns: []}
//   4) amname changed -> other, user confirms              -> exColumnSchema
//      gets empty operClass options + no-sort defaults,
//      delta {columns: []}
//   5) amname changed, user cancels                        -> delta
//      {amname: oldValue}, exColumnSchema NOT mutated

import ExclusionConstraintSchema from
  '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/exclusion_constraint/static/js/exclusion_constraint.ui';
import pgAdmin from '../fake_pgadmin';

const makeSchema = () => {
  const operClassOptions = [{ label: 'oc1', value: 'oc1' }];
  const schema = new ExclusionConstraintSchema(
    {
      columns: () => Promise.resolve([]),
      amname: () => Promise.resolve([]),
      spcname: () => Promise.resolve([]),
      getOperClass: () => operClassOptions,
      getOperator: () => Promise.resolve([]),
    },
    {},
  );
  return schema;
};

const getAmnameDeferred = (schema) => {
  const field = schema.fields.find((f) => f.id === 'amname');
  expect(field).toBeDefined();
  expect(typeof field.deferredDepChange).toBe('function');
  return field.deferredDepChange.bind(schema);
};

describe('ExclusionConstraintSchema.amname deferredDepChange', () => {
  let schema, deferredDepChange, confirmSpy;
  let setOperClassSpy, changeDefaultsSpy;

  beforeEach(() => {
    schema = makeSchema();
    deferredDepChange = getAmnameDeferred(schema);
    confirmSpy = jest.spyOn(pgAdmin.Browser.notifier, 'confirm');
    confirmSpy.mockClear();
    setOperClassSpy = jest.spyOn(schema.exColumnSchema, 'setOperClassOptions')
      .mockImplementation(() => {});
    changeDefaultsSpy = jest.spyOn(schema.exColumnSchema, 'changeDefaults')
      .mockImplementation(() => {});
  });
  afterEach(() => {
    confirmSpy.mockRestore();
    setOperClassSpy.mockRestore();
    changeDefaultsSpy.mockRestore();
  });

  // ---- No-op paths (new contract) ----------------------------------------

  test('no-op: amname unchanged → returns undefined', () => {
    const state = { amname: 'btree', columns: [{ column: 'c1' }] };
    const result = deferredDepChange(state, null, null, {
      oldState: { amname: 'btree' },
    });
    expect(result).toBeUndefined();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  test('no-op: amname changed but columns empty → returns undefined', () => {
    const state = { amname: 'gist', columns: [] };
    const result = deferredDepChange(state, null, null, {
      oldState: { amname: 'btree' },
    });
    expect(result).toBeUndefined();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  // ---- Confirm paths (characterization) ----------------------------------

  test('confirm with amname=btree → exColumnSchema gets btree operClass + sort defaults, delta {columns: []}', async () => {
    const state = { amname: 'btree', columns: [{ column: 'c1' }] };
    const result = deferredDepChange(state, null, null, {
      oldState: { amname: 'gist' },
    });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const [, , confirmCb] = confirmSpy.mock.calls[0];

    confirmCb();
    const cb = await result;
    expect(cb()).toEqual({ columns: [] });
    expect(setOperClassSpy).toHaveBeenCalled();
    expect(changeDefaultsSpy).toHaveBeenCalledWith({
      order: true,
      nulls_order: true,
      is_sort_nulls_applicable: true,
    });
    expect(schema.exColumnSchema.amname).toBe('btree');
  });

  test('confirm with amname=gist → exColumnSchema gets empty operClass + no-sort defaults, delta {columns: []}', async () => {
    const state = { amname: 'gist', columns: [{ column: 'c1' }] };
    const result = deferredDepChange(state, null, null, {
      oldState: { amname: 'btree' },
    });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const [, , confirmCb] = confirmSpy.mock.calls[0];

    confirmCb();
    const cb = await result;
    expect(cb()).toEqual({ columns: [] });
    expect(setOperClassSpy).toHaveBeenCalledWith([]);
    expect(changeDefaultsSpy).toHaveBeenCalledWith({
      order: false,
      nulls_order: false,
      is_sort_nulls_applicable: false,
    });
    expect(schema.exColumnSchema.amname).toBe('gist');
  });

  // ---- Cancel path (characterization) ------------------------------------

  test('cancel → delta {amname: oldValue}, exColumnSchema NOT mutated', async () => {
    const state = { amname: 'gist', columns: [{ column: 'c1' }] };
    const result = deferredDepChange(state, null, null, {
      oldState: { amname: 'btree' },
    });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const [, , , cancelCb] = confirmSpy.mock.calls[0];

    cancelCb();
    const cb = await result;
    expect(cb()).toEqual({ amname: 'btree' });
    expect(setOperClassSpy).not.toHaveBeenCalled();
    expect(changeDefaultsSpy).not.toHaveBeenCalled();
    // Input state's amname is NOT mutated.
    expect(state.amname).toBe('gist');
  });
});
