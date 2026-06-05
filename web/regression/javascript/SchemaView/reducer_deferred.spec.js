/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Tests for the sessDataReducer's interaction with the deferred-dep
// queue. The reducer must APPEND new deferred items to data.__deferred__
// rather than replacing the queue — otherwise two SET_VALUE actions
// that fire in the same React batch can lose the first action's pending
// promise(s) before the drain useEffect runs.

import {
  SCHEMA_STATE_ACTIONS,
  sessDataReducer,
} from '../../../pgadmin/static/js/SchemaView/SchemaState';

describe('sessDataReducer — deferred queue accumulation', () => {
  const initial = { name: '', other: '', __changeId: 0 };

  // A trivial deferredDepChange that returns a unique-tagged promise so
  // we can identify which actions produced which items.
  const makeDefDepChange = (tag) =>
    (_currPath, _newState, _action) => [{ tag, promise: Promise.resolve(() => ({})) }];
  // Note: the reducer's getDeferredDepChange (top of reducer.js) calls
  // action.deferredDepChange(currPath, newState, {type, path, value,
  // depChange, oldState}). The return value is what becomes
  // __deferred__. The reducer itself doesn't care about the inner shape
  // — only that it's an array — so we can stuff in tagged sentinels.

  test('SET_VALUE installs the deferred list in __deferred__', () => {
    const action = {
      type: SCHEMA_STATE_ACTIONS.SET_VALUE,
      path: ['name'], value: 'a',
      deferredDepChange: makeDefDepChange('first'),
    };
    const next = sessDataReducer(initial, action);
    expect(next.__deferred__).toHaveLength(1);
    expect(next.__deferred__[0].tag).toBe('first');
  });

  test('a second SET_VALUE APPENDS to __deferred__ instead of replacing', () => {
    // Simulate two synchronous SET_VALUEs in the same React batch: the
    // first leaves a deferred item; the second must preserve it.
    const after1 = sessDataReducer(initial, {
      type: SCHEMA_STATE_ACTIONS.SET_VALUE,
      path: ['name'], value: 'a',
      deferredDepChange: makeDefDepChange('first'),
    });
    expect(after1.__deferred__).toHaveLength(1);

    const after2 = sessDataReducer(after1, {
      type: SCHEMA_STATE_ACTIONS.SET_VALUE,
      path: ['other'], value: 'b',
      deferredDepChange: makeDefDepChange('second'),
    });
    expect(after2.__deferred__).toHaveLength(2);
    expect(after2.__deferred__.map((i) => i.tag)).toEqual(['first', 'second']);
  });

  test('SET_VALUE with no deferredDepChange leaves the existing queue alone', () => {
    const after1 = sessDataReducer(initial, {
      type: SCHEMA_STATE_ACTIONS.SET_VALUE,
      path: ['name'], value: 'a',
      deferredDepChange: makeDefDepChange('first'),
    });
    expect(after1.__deferred__).toHaveLength(1);

    // No deferredDepChange — should not clobber the queue.
    const after2 = sessDataReducer(after1, {
      type: SCHEMA_STATE_ACTIONS.SET_VALUE,
      path: ['other'], value: 'b',
    });
    expect(after2.__deferred__).toHaveLength(1);
    expect(after2.__deferred__[0].tag).toBe('first');
  });

  test('CLEAR_DEFERRED_QUEUE empties __deferred__', () => {
    const after1 = sessDataReducer(initial, {
      type: SCHEMA_STATE_ACTIONS.SET_VALUE,
      path: ['name'], value: 'a',
      deferredDepChange: makeDefDepChange('first'),
    });
    expect(after1.__deferred__).toHaveLength(1);

    const cleared = sessDataReducer(after1, {
      type: SCHEMA_STATE_ACTIONS.CLEAR_DEFERRED_QUEUE,
    });
    expect(cleared.__deferred__).toHaveLength(0);
  });
});
