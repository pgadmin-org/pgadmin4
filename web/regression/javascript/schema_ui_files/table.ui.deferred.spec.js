/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Opt-out + no-mutation contract tests for TableSchema's
// deferredDepChange on `typname` and `coll_inherits`. The happy paths
// for both fields are already covered by table.ui.spec.js; this file
// adds:
//
//   * typname        — no-change branch must return undefined,
//                      not a Promise wrapping a no-op callback
//   * coll_inherits  — same-length / both-empty / deep-equal must
//                      return undefined (previously hung)
//   * coll_inherits  — remove branch's callback must NOT mutate
//                      tmpstate.columns

import _ from 'lodash';
import { getNodeTableSchema } from
  '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/table.ui';
import * as nodeAjax from
  '../../../pgadmin/browser/static/js/node_ajax';

const makeSchema = () => {
  jest.spyOn(nodeAjax, 'getNodeAjaxOptions').mockReturnValue(Promise.resolve([]));
  jest.spyOn(nodeAjax, 'getNodeListByName').mockReturnValue(Promise.resolve([]));
  return getNodeTableSchema(
    { server: { _id: 1 }, schema: { _label: 'public' } }, {},
    {
      Nodes: { table: {} },
      serverInfo: { 1: { user: { name: 'Postgres' } } },
    },
  );
};

const getDeferred = (schema, fieldId) => {
  const field = _.find(schema.fields, (f) => f.id === fieldId);
  expect(field).toBeDefined();
  expect(typeof field.deferredDepChange).toBe('function');
  return field.deferredDepChange.bind(schema);
};

describe('TableSchema.typname deferredDepChange — opt-out contract', () => {
  let schema, deferredDepChange;

  beforeEach(() => {
    schema = makeSchema();
    deferredDepChange = getDeferred(schema, 'typname');
    jest.spyOn(schema, 'changeColumnOptions').mockImplementation(() => {});
  });

  test('no change → returns undefined (was Promise wrapping no-op callback)', () => {
    const result = deferredDepChange(
      { typname: null }, null, null, { oldState: { typname: null } },
    );
    expect(result).toBeUndefined();
  });

  test('both equal non-empty → returns undefined', () => {
    const result = deferredDepChange(
      { typname: 'type1' }, null, null, { oldState: { typname: 'type1' } },
    );
    expect(result).toBeUndefined();
  });

  test('stale ofTypeTables (state.typname not in options) → callback does not throw, columns=[]', async () => {
    // Aggressive review caught: when state.typname is non-empty but
    // doesn't match any loaded option (option list stale or empty),
    // the original code did `typeTable.oftype_columns` on `undefined`
    // and threw. The drain swallowed the throw into console.error
    // with zero user feedback.
    schema.ofTypeTables = []; // stale / empty
    // Simulate the "later selection" path (typname changed, not from null).
    const result = deferredDepChange(
      { typname: 'no_such_type' }, null, null,
      { oldState: { typname: 'old_type' } },
    );
    expect(result).toBeInstanceOf(Promise);
    const cb = await result;
    expect(() => cb()).not.toThrow();
    const delta = cb();
    expect(delta.columns).toEqual([]);
    expect(delta.primary_key).toEqual([]);
  });
});

describe('TableSchema.coll_inherits deferredDepChange — opt-out + no-mutation', () => {
  let schema, deferredDepChange;

  beforeEach(() => {
    schema = makeSchema();
    deferredDepChange = getDeferred(schema, 'coll_inherits');
    jest.spyOn(schema, 'changeColumnOptions').mockImplementation(() => {});
    jest.spyOn(schema, 'getTableOid').mockReturnValue(140391);
    jest.spyOn(schema, 'getColumns').mockResolvedValue([]);
  });

  test('both empty → returns undefined (was a hanging Promise)', () => {
    const result = deferredDepChange(
      { coll_inherits: [], columns: [] }, null, null,
      { oldState: { coll_inherits: [] } },
    );
    expect(result).toBeUndefined();
    expect(schema.getColumns).not.toHaveBeenCalled();
  });

  test('deep-equal repeat → returns undefined', () => {
    const result = deferredDepChange(
      { coll_inherits: ['t1', 't2'], columns: [] }, null, null,
      { oldState: { coll_inherits: ['t1', 't2'] } },
    );
    expect(result).toBeUndefined();
    expect(schema.getColumns).not.toHaveBeenCalled();
  });

  test('same-length swap → processes the remove so stale columns are cleared', async () => {
    // Same shape as the foreign_table same-length swap fix.
    schema.getTableOid.mockImplementation((name) =>
      ({ t1: 1, t2: 2, t3: 3 })[name]);
    const result = deferredDepChange(
      { coll_inherits: ['t1', 't3'], columns: [] }, null, null,
      { oldState: { coll_inherits: ['t1', 't2'] } },
    );
    expect(result).toBeInstanceOf(Promise);
    const cb = await result;
    const tmpCols = [
      { name: 'kept_local', inheritedid: null },
      { name: 'from_t1',    inheritedid: 1 },
      { name: 'from_t2',    inheritedid: 2 }, // t2 was removed
    ];
    const delta = cb({ columns: tmpCols });
    expect(delta.columns).toEqual([
      { name: 'kept_local', inheritedid: null },
      { name: 'from_t1',    inheritedid: 1 },
    ]);
    expect(schema.getColumns).not.toHaveBeenCalled();
  });

  test('remove of a table missing from inheritedTableList → returns undefined (regression guard)', () => {
    // Data-loss regression found during aggressive review. If the
    // removed table is not in `inheritedTableList`, getTableOid returns
    // undefined and the legacy refactored callback would have filtered
    // out every column with `inheritedid` equal-by-coercion to undefined
    // (i.e. null or missing) — silently dropping local user-added
    // columns. Contract: opt out.
    jest.spyOn(schema, 'getTableOid').mockReturnValue(undefined);
    const result = deferredDepChange(
      { coll_inherits: ['t1'], columns: [] }, null, null,
      { oldState: { coll_inherits: ['t1', 't2'] } },
    );
    expect(result).toBeUndefined();
    expect(schema.getColumns).not.toHaveBeenCalled();
  });

  test('remove → callback does NOT mutate tmpstate.columns', async () => {
    const result = deferredDepChange(
      { coll_inherits: [], columns: [] }, null, null,
      { oldState: { coll_inherits: ['t1'] } },
    );
    const cb = await result;
    const tmpCols = [
      { name: 'kept', inheritedid: null },
      { name: 'inherited', inheritedid: 140391 },
    ];
    const delta = cb({ columns: tmpCols });
    expect(delta.columns).toEqual([{ name: 'kept', inheritedid: null }]);
    // tmpstate.columns must be intact (we used to splice it).
    expect(tmpCols).toHaveLength(2);
    expect(tmpCols[1]).toEqual({ name: 'inherited', inheritedid: 140391 });
  });
});
