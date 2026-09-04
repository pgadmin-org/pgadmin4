/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Deterministic test for the drain useEffect's dep-array race:
// when two SET_VALUE dispatches land in the same React batch, the
// reducer's `data.__deferred__` array may end the batch at the same
// length it started, even though new items were appended after the
// drainer's CLEAR ran. A length-based dep array compares equal
// across renders and the second drain never fires.
//
// The fix uses the array REFERENCE as the dep. The reducer creates a
// new __deferred__ array on every dispatch (via _.cloneDeep at entry +
// `.concat(...)` in the APPEND), so ref-equality changes whenever the
// queue does and the effect re-runs.

import React, { useReducer, useEffect } from 'react';
import { render, act } from '@testing-library/react';
import {
  SCHEMA_STATE_ACTIONS,
  sessDataReducer,
} from '../../../pgadmin/static/js/SchemaView/SchemaState';

// Mirror of the drain useEffect from useSchemaState.js with an
// injectable spy so the test can count invocations per render commit.
// The spy receives `dispatch` so the test can simulate a synchronous
// follow-up SET_VALUE (the racey case where the effect's CLEAR and a
// new SET_VALUE batch into the same commit, round-tripping length).
const useDrain = (sessData, drainSpy, dispatch) => {
  useEffect(() => {
    const items = sessData.__deferred__ || [];
    if (items.length === 0) return;
    // Mirror production order: dispatch CLEAR first, THEN run the
    // drainer (which may synchronously dispatch a follow-up SET_VALUE
    // — that's how the racey case lands CLEAR+SET_VALUE in one
    // batch with the length round-tripping through 0).
    dispatch({ type: SCHEMA_STATE_ACTIONS.CLEAR_DEFERRED_QUEUE });
    drainSpy(items, dispatch);
  }, [sessData.__deferred__]);
};

const Harness = React.forwardRef(({ drainSpy }, ref) => {
  const [sessData, dispatch] = useReducer(sessDataReducer, {
    name: '', other: '', __changeId: 0,
  });
  useDrain(sessData, drainSpy, dispatch);
  React.useImperativeHandle(ref, () => ({ dispatch, sessData }), [sessData]);
  return null;
});
Harness.displayName = 'Harness';

const makeAction = (path, value, tag) => ({
  type: SCHEMA_STATE_ACTIONS.SET_VALUE,
  path, value,
  // The reducer reads `action.deferredDepChange` to populate the queue;
  // we stub it to return a single tagged item per dispatch.
  deferredDepChange: () => [{
    action: { path, depChange: () => {} },
    listener: { source: path, dest: path },
    promise: Promise.resolve(() => ({})),
    tag,
  }],
});

describe('drain useEffect — batched-dispatch race', () => {
  test('drain-time CLEAR + synchronous SET_VALUE batched together: both items reach the drain spy', async () => {
    // Engineers the exact race the ref-based dep array fixes:
    //   render N:    __deferred__ = [first]   (length 1)
    //   effect fires, drainSpy called with [first]
    //   drainSpy synchronously dispatches a follow-up SET_VALUE
    //     => SET_VALUE appends 'second'
    //   effect then dispatches CLEAR
    //   render N+1 commits both: CLEAR (→ []) + SET_VALUE (→ [second])
    //   final __deferred__ = [second]   (length 1)
    //   PREVIOUS length was 1, CURRENT length is 1 — length-dep sees
    //     no change, effect skips, 'second' never drains.
    const drainSpy = jest.fn((items, dispatch) => {
      // Only inject the follow-up on the first call so the test
      // terminates (otherwise we'd recurse).
      if (items.some((i) => i.tag === 'first')) {
        dispatch(makeAction(['other'], 'b', 'second'));
      }
    });
    const ref = React.createRef();
    render(<Harness ref={ref} drainSpy={drainSpy} />);

    await act(async () => {
      ref.current.dispatch(makeAction(['name'], 'a', 'first'));
    });
    // Let any cascaded effects flush.
    await act(async () => { await Promise.resolve(); });

    const seenTags = drainSpy.mock.calls
      .flatMap((call) => call[0])
      .map((item) => item.tag);
    expect(seenTags).toContain('first');
    expect(seenTags).toContain('second');
  });
});
