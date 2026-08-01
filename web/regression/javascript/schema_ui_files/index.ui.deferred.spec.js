/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Characterization + contract tests for the `amname` deferredDepChange
// on IndexSchema. The four reachable paths are:
//   1) amname unchanged                                  -> no-op
//   2) amname changed, columns empty                     -> no-op
//   3) amname changed, columns present, user confirms    -> clear columns
//   4) amname changed, columns present, user cancels     -> revert amname
//
// These tests assert the OBSERVABLE outputs (returned promise, callback
// return value, side-effects on the input state) so a refactor that
// preserves intent can be verified against them.

import IndexSchema from
  '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/indexes/static/js/index.ui';
// IndexSchema's deferredDepChange calls `pgAdmin.Browser.notifier.confirm`
// via `import pgAdmin from 'sources/pgadmin'`. Jest's moduleNameMapper
// redirects `sources/pgadmin` to fake_pgadmin, so we import the SAME
// instance here and spy on its `confirm`.
import pgAdmin from '../fake_pgadmin';

const getAmnameDeferredDepChange = () => {
  const schema = new IndexSchema(
    { amname: () => Promise.resolve([]) },
    { table: {} },
  );
  const field = schema.baseFields.find((f) => f.id === 'amname');
  expect(field).toBeDefined();
  expect(typeof field.deferredDepChange).toBe('function');
  return field.deferredDepChange.bind(schema);
};

describe('IndexSchema.amname deferredDepChange — characterization', () => {
  let deferredDepChange;
  let confirmSpy;
  beforeEach(() => {
    deferredDepChange = getAmnameDeferredDepChange();
    confirmSpy = jest.spyOn(pgAdmin.Browser.notifier, 'confirm');
    confirmSpy.mockClear();
  });
  afterEach(() => { confirmSpy.mockRestore(); });

  // ---- No-op paths ---------------------------------------------------------

  test('no-op: amname unchanged — returns undefined (opts out of queue)', () => {
    const state = { amname: 'btree', columns: [{ name: 'c1' }] };
    const result = deferredDepChange(state, null, null, {
      oldState: { amname: 'btree' },
    });
    expect(result).toBeUndefined();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  test('no-op: amname changed but columns empty — returns undefined', () => {
    const state = { amname: 'hash', columns: [] };
    const result = deferredDepChange(state, null, null, {
      oldState: { amname: 'btree' },
    });
    expect(result).toBeUndefined();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  // ---- Confirm path --------------------------------------------------------

  test('change + confirm: callback returns {columns: []} as a fresh empty array, without mutating input state', async () => {
    const originalColumns = [{ name: 'c1' }, { name: 'c2' }];
    const state = { amname: 'hash', columns: originalColumns };
    const result = deferredDepChange(state, null, null, {
      oldState: { amname: 'btree' },
    });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const [/* title */, /* msg */, confirmCb /* cancelCb */] =
      confirmSpy.mock.calls[0];

    confirmCb();
    const cb = await result;
    expect(typeof cb).toBe('function');
    const delta = cb();
    expect(delta).toEqual({ columns: [] });
    // New contract: no input-state mutation.
    expect(state.columns).toBe(originalColumns);
    expect(originalColumns).toHaveLength(2);
  });

  // ---- Cancel path ---------------------------------------------------------

  test('change + cancel: callback returns {amname: oldValue} without mutating input state', async () => {
    const state = { amname: 'hash', columns: [{ name: 'c1' }] };
    const result = deferredDepChange(state, null, null, {
      oldState: { amname: 'btree' },
    });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const [, , , cancelCb] = confirmSpy.mock.calls[0];

    cancelCb();
    const cb = await result;
    expect(typeof cb).toBe('function');
    const delta = cb();
    expect(delta).toEqual({ amname: 'btree' });
    // New contract: input state's amname is NOT mutated.
    expect(state.amname).toBe('hash');
  });
});
