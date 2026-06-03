/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Guards the dispatcher-only contract: every path-bearing action
// (SET_VALUE, ADD_ROW, DELETE_ROW, MOVE_ROW, BULK_UPDATE,
// DEFERRED_DEPCHANGE) MUST be dispatched through
// useSchemaState.sessDispatchWithListener so the changedPath
// accumulator catches it. If anyone adds a raw `sessDispatch(...)`
// call with one of these types, the reducer warns under canary
// builds.
//
// This is the only thing standing between the post-fix accumulator
// staying correct and a silent regression: a new code path that
// dispatches outside the listener wrapper would drop its changedPath
// into a black hole, and the next React-batched validate would run
// without it.

import { sessDataReducer, SCHEMA_STATE_ACTIONS } from
  '../../../pgadmin/static/js/SchemaView/SchemaState';

// setup-jest.js auto-spies console.error and asserts in afterEach
// that no test triggered it. Tests in this file deliberately fire
// console.error to exercise the bypass guard, so we clear the
// global spy's call list at the END of each test (after our own
// assertions). The local spy variable is just an alias to the
// already-installed global spy so we can call .mock methods.
let errSpy;
beforeEach(() => {
   
  errSpy = console.error;
});
afterEach(() => {
   
  console.error.mockClear();
});

describe('reducer bypass guard — canary build', () => {
  test('fires console.error when SET_VALUE arrives without __viaListener', () => {
    const action = {
      type: SCHEMA_STATE_ACTIONS.SET_VALUE,
      path: ['name'],
      value: 'x',
    };
    sessDataReducer({ __changeId: 0, name: '' }, action);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringMatching(/dispatcher bypass/),
      expect.objectContaining({ path: ['name'], type: 'set_value' }),
    );
    errSpy.mockClear();
  });

  test('silent when SET_VALUE carries __viaListener', () => {
    const action = {
      type: SCHEMA_STATE_ACTIONS.SET_VALUE,
      path: ['name'],
      value: 'x',
      __viaListener: true,
    };
    sessDataReducer({ __changeId: 0, name: '' }, action);
    expect(errSpy).not.toHaveBeenCalled();
  });

  test('silent for INIT (not a path-bearing action)', () => {
    sessDataReducer(
      { __changeId: 0 },
      { type: SCHEMA_STATE_ACTIONS.INIT, payload: { __changeId: 1 } },
    );
    expect(errSpy).not.toHaveBeenCalled();
  });

  test('silent for CLEAR_DEFERRED_QUEUE (internal plumbing)', () => {
    sessDataReducer(
      { __changeId: 0, __deferred__: [] },
      { type: SCHEMA_STATE_ACTIONS.CLEAR_DEFERRED_QUEUE },
    );
    expect(errSpy).not.toHaveBeenCalled();
  });

  test('fires for ADD_ROW bypass', () => {
    sessDataReducer(
      { __changeId: 0, rows: [] },
      { type: SCHEMA_STATE_ACTIONS.ADD_ROW, path: ['rows'], value: {} },
    );
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringMatching(/dispatcher bypass/),
      expect.objectContaining({ type: 'add_row' }),
    );
    errSpy.mockClear();
  });

  test('fires for DELETE_ROW bypass', () => {
    sessDataReducer(
      { __changeId: 0, rows: [{}] },
      { type: SCHEMA_STATE_ACTIONS.DELETE_ROW, path: ['rows'], value: 0 },
    );
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringMatching(/dispatcher bypass/),
      expect.objectContaining({ type: 'delete_row' }),
    );
    errSpy.mockClear();
  });
});
