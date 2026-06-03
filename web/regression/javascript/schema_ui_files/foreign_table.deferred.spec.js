/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Characterization + contract tests for the inherits deferredDepChange
// on ForeignTableSchema. Reachable paths:
//   add  : new list grew                                   -> fetch columns,
//          append fetched cols to tmpstate.columns
//   rm   : new list shrank                                 -> drop columns
//          whose inheritedid == removed table's oid
//   noop : new == old (same shape or both empty)           -> return undefined
//
// The new contract additionally requires:
//   - no input-state mutation
//   - opt-out path returns undefined (not a hanging Promise)

import ForeignTableSchema from
  '../../../pgadmin/browser/server_groups/servers/databases/schemas/foreign_tables/static/js/foreign_table.ui';

const makeSchema = (getColumnsMock) => {
  const schema = new ForeignTableSchema(
    () => null, () => null,
    getColumnsMock,
    { role: [], schema: [], foreignServers: [], tables: [] },
  );
  schema.inheritedTableList = [
    { label: 'a', value: 1 },
    { label: 'b', value: 2 },
    { label: 'c', value: 3 },
  ];
  // Make columnsObj.getNewData deterministic and observable.
  jest.spyOn(schema.columnsObj, 'getNewData')
    .mockImplementation((col) => ({ ...col, inheritedid: col.inheritedid }));
  return schema;
};

const getDeferred = (schema) => {
  const field = schema.fields.find((f) => f.id === 'inherits');
  expect(field).toBeDefined();
  expect(typeof field.deferredDepChange).toBe('function');
  return field.deferredDepChange.bind(schema);
};

describe('ForeignTableSchema.inherits deferredDepChange', () => {
  let schema, deferredDepChange, getColumnsMock;

  beforeEach(() => {
    getColumnsMock = jest.fn();
    schema = makeSchema(getColumnsMock);
    deferredDepChange = getDeferred(schema);
  });

  // ---- ADD paths (characterization) --------------------------------------

  test('first table added → fetches columns, callback appends to tmpstate.columns', async () => {
    getColumnsMock.mockResolvedValue([{ name: 'col_x', inheritedid: 1 }]);
    const state = { inherits: [1] };
    const result = deferredDepChange(state, null, null, {
      oldState: { inherits: [] },
    });
    const cb = await result;
    expect(getColumnsMock).toHaveBeenCalledWith({ attrelid: 1 });
    const delta = cb({ columns: [{ name: 'existing', inheritedid: null }] });
    expect(delta.adding_inherit_cols).toBe(false);
    expect(delta.columns).toEqual([
      { name: 'existing', inheritedid: null },
      { name: 'col_x', inheritedid: 1 },
    ]);
  });

  test('additional table added → fetches columns for the newly added id', async () => {
    getColumnsMock.mockResolvedValue([{ name: 'col_y', inheritedid: 2 }]);
    const state = { inherits: [1, 2] };
    const result = deferredDepChange(state, null, null, {
      oldState: { inherits: [1] },
    });
    const cb = await result;
    expect(getColumnsMock).toHaveBeenCalledWith({ attrelid: 2 });
    const delta = cb({ columns: [{ name: 'col_x', inheritedid: 1 }] });
    expect(delta.columns).toEqual([
      { name: 'col_x', inheritedid: 1 },
      { name: 'col_y', inheritedid: 2 },
    ]);
  });

  // ---- REMOVE paths (characterization, plus no-mutation contract) --------

  test('one of several removed → drops columns with that inheritedid, without mutating tmpstate.columns', async () => {
    const state = { inherits: [1] };
    const result = deferredDepChange(state, null, null, {
      oldState: { inherits: [1, 2] },
    });
    const cb = await result;
    const tmpCols = [
      { name: 'col_x', inheritedid: 1 },
      { name: 'col_y', inheritedid: 2 },
    ];
    const delta = cb({ columns: tmpCols });
    expect(delta.adding_inherit_cols).toBe(false);
    expect(delta.columns).toEqual([{ name: 'col_x', inheritedid: 1 }]);
    // New contract: tmpstate's columns array is NOT mutated.
    expect(tmpCols).toHaveLength(2);
    expect(tmpCols[1]).toEqual({ name: 'col_y', inheritedid: 2 });
  });

  test('last one removed → drops columns belonging to the last table', async () => {
    const state = { inherits: [] };
    const result = deferredDepChange(state, null, null, {
      oldState: { inherits: [3] },
    });
    const cb = await result;
    const tmpCols = [
      { name: 'col_z', inheritedid: 3 },
      { name: 'local', inheritedid: null },
    ];
    const delta = cb({ columns: tmpCols });
    expect(delta.columns).toEqual([{ name: 'local', inheritedid: null }]);
    expect(tmpCols).toHaveLength(2);
  });

  // ---- NEW CONTRACT: opt-out paths ---------------------------------------

  test('no-op: both lists empty → returns undefined (was a hanging Promise)', () => {
    const result = deferredDepChange(
      { inherits: [] }, null, null, { oldState: { inherits: [] } },
    );
    expect(result).toBeUndefined();
    expect(getColumnsMock).not.toHaveBeenCalled();
  });

  test('no-op: lists are deep-equal (re-fired without real change) → returns undefined', () => {
    const result = deferredDepChange(
      { inherits: [1, 2] }, null, null, { oldState: { inherits: [1, 2] } },
    );
    expect(result).toBeUndefined();
    expect(getColumnsMock).not.toHaveBeenCalled();
  });

  // ---- Regression: stale inheritedTableList ------------------------------

  test('remove of a table missing from inheritedTableList → returns undefined (no silent loss of local columns)', () => {
    // Reproduces the data-loss bug found during aggressive review.
    // If the removed table is not in `inheritedTableList`, getTableOid
    // returns undefined, and the old callback would have filtered out
    // every column with `inheritedid == undefined || null` — including
    // user-added local columns. Contract: opt out instead.
    const schemaWithStaleList = makeSchema(getColumnsMock);
    schemaWithStaleList.inheritedTableList = []; // stale: removed table not here
    const defChange = getDeferred(schemaWithStaleList);
    const result = defChange(
      { inherits: [] }, null, null, { oldState: { inherits: [99 /* unknown */] } },
    );
    expect(result).toBeUndefined();
    expect(getColumnsMock).not.toHaveBeenCalled();
  });

  test('same length, swapped content (replace) → processes the remove so stale columns are cleared', async () => {
    // A multi-select swap (e.g. user replaces parent table A with B
    // while keeping C) emits a same-length array with different
    // contents. Old behavior: opt out → stale columns from the
    // removed parent stay forever. New behavior: detect the remove
    // direction and apply it; the next selection of the new parent
    // (when getColumns succeeds) will trigger a normal ADD for those.
    const result = deferredDepChange(
      { inherits: [1, 2] }, null, null, { oldState: { inherits: [2, 3] } },
    );
    expect(result).toBeInstanceOf(Promise);
    const cb = await result;
    const tmpCols = [
      { name: 'kept_local', inheritedid: null },
      { name: 'from_2',     inheritedid: 2 },
      { name: 'from_3',     inheritedid: 3 }, // 3 was removed
    ];
    const delta = cb({ columns: tmpCols });
    expect(delta.columns).toEqual([
      { name: 'kept_local', inheritedid: null },
      { name: 'from_2',     inheritedid: 2 },
    ]);
    // No new fetch fired — adds are handled by the next user gesture.
    expect(getColumnsMock).not.toHaveBeenCalled();
  });
});
