/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';

import { logAction, record } from '../perf';
import {
  SCHEMA_STATE_ACTIONS, getDepChange,
} from './common';

const getDeferredDepChange = (currPath, newState, oldState, action) => {
  if(action.deferredDepChange) {
    return action.deferredDepChange(currPath, newState, {
      type: action.type,
      path: action.path,
      value: action.value,
      depChange: action.depChange,
      oldState: _.cloneDeep(oldState),
    });
  }
};

/*
 * The main function which manipulates the session state based on actions.
 *
 * The state is managed based on path array of a particular key.
 * For Eg. if the state is
 * {
 *   key1: {
 *     ckey1: [
 *       {a: 0, b: 0},
 *       {a: 1, b: 1}
 *     ]
 *   }
 * }
 *
 * The path for b in first row will be '[key1, ckey1, 0, b]'.
 * The path for second row of ckey1 will be '[key1, ckey1, 1]'.
 *
 * The path for key1 is '[key1]'.
 * The state starts with path '[]'.
 */
// Action types that carry a `path` and must therefore be dispatched
// through useSchemaState.sessDispatchWithListener (so the
// __pendingChangedPaths accumulator catches them). INIT and
// CLEAR_DEFERRED_QUEUE are exempt — INIT resets everything (so a
// full walk is the right next move anyway), and CLEAR_DEFERRED_QUEUE
// is internal plumbing.
const PATH_BEARING_ACTIONS = new Set([
  SCHEMA_STATE_ACTIONS.SET_VALUE,
  SCHEMA_STATE_ACTIONS.ADD_ROW,
  SCHEMA_STATE_ACTIONS.DELETE_ROW,
  SCHEMA_STATE_ACTIONS.MOVE_ROW,
  SCHEMA_STATE_ACTIONS.BULK_UPDATE,
  SCHEMA_STATE_ACTIONS.DEFERRED_DEPCHANGE,
]);

export const sessDataReducer = (state, action) => {
  const reducerStart = performance.now();
  const label = `reducer.${action.type}`;

  // Bypass detection (canary builds only — substituted to literal
  // `false` in production, so the whole `if` tree-shakes out).
  // If a path-bearing action arrives without the __viaListener
  // sentinel, somebody added a sessDispatch call outside
  // sessDispatchWithListener — they need to switch to the listener
  // path so changedPath joins the accumulator, otherwise the
  // incremental walker silently falls back to a full walk for that
  // dispatch and any pending paths are processed without it.
  if (process.env.__CANARY_BUILD__
      && PATH_BEARING_ACTIONS.has(action.type)
      && !action.__viaListener) {
    // console.error (not warn) so setup-jest's afterEach assertion
    // `expect(console.error).not.toHaveBeenCalled()` fails the suite
    // when a bypass slips in. A warning would be drowned in a noisy
    // CI log; an error breaks the test, which is the whole point of
    // the guard. In production this is dead-code-eliminated via the
    // `process.env.__CANARY_BUILD__` gate.
    // eslint-disable-next-line no-console
    console.error(
      `[schemaview] dispatcher bypass: action type "${action.type}" `
      + 'reached the reducer without going through '
      + 'sessDispatchWithListener. The incremental walker will run as '
      + 'a full walk for this commit; if multiple paths batch, the '
      + 'accumulator will miss this one. Route the dispatch through '
      + '`dataDispatch` (the listener-wrapped one returned by '
      + 'useSchemaState) instead of a raw sessDispatch.',
      { path: action.path, type: action.type }
    );
  }

  const cloneStart = performance.now();
  let data = _.cloneDeep(state);
  record('reducer.cloneDeep', performance.now() - cloneStart);

  let rows, cid, deferredList;
  data.__deferred__ = data.__deferred__ || [];

  switch(action.type) {
  case SCHEMA_STATE_ACTIONS.INIT:
    data = action.payload;
    break;

  case SCHEMA_STATE_ACTIONS.BULK_UPDATE:
    rows = _.get(data, action.path) || [];
    rows.forEach((row) => { row[action.id] = false; });
    _.set(data, action.path, rows);
    break;

  case SCHEMA_STATE_ACTIONS.SET_VALUE:
    _.set(data, action.path, action.value);
    // If there is any dep listeners get the changes.
    data = getDepChange(action.path, data, state, action);
    deferredList = getDeferredDepChange(
      action.path, _.cloneDeep(data), state, action
    );
    // APPEND rather than replace — multiple SET_VALUEs in the same
    // React batch each contribute their deferred promises to the queue.
    // Replacing the array would lose still-pending promises from the
    // previous action. The drain useEffect in useSchemaState then
    // processes the full list and `CLEAR_DEFERRED_QUEUE` empties it.
    if (deferredList && deferredList.length > 0) {
      data.__deferred__ = (data.__deferred__ || []).concat(deferredList);
    }
    break;

  case SCHEMA_STATE_ACTIONS.ADD_ROW:
    // Create id to identify a row uniquely, usefull when getting diff.
    cid = _.uniqueId('c');
    action.value['cid'] = cid;

    if (action.addOnTop) {
      rows = [].concat(action.value).concat(_.get(data, action.path) || []);
    } else {
      rows = (_.get(data, action.path) || []).concat(action.value);
    }

    _.set(data, action.path, rows);

    // If there is any dep listeners get the changes.
    data = getDepChange(action.path, data, state, action);

    break;

  case SCHEMA_STATE_ACTIONS.DELETE_ROW:
    rows = _.get(data, action.path)||[];
    rows.splice(action.value, 1);

    _.set(data, action.path, rows);

    // If there is any dep listeners get the changes.
    data = getDepChange(action.path, data, state, action);

    break;

  case SCHEMA_STATE_ACTIONS.MOVE_ROW: {
    rows = _.get(data, action.path)||[];
    let row = rows[action.oldIndex];
    rows.splice(action.oldIndex, 1);
    rows.splice(action.newIndex, 0, row);

    _.set(data, action.path, rows);

    break;
  }
  case SCHEMA_STATE_ACTIONS.CLEAR_DEFERRED_QUEUE:
    data.__deferred__ = [];
    return data;

  case SCHEMA_STATE_ACTIONS.DEFERRED_DEPCHANGE:
    data = getDepChange(action.path, _.cloneDeep(data), state, action);
    break;
  }

  data.__changeId = (data.__changeId || 0) + 1;

  const totalDt = performance.now() - reducerStart;
  record(label, totalDt);
  logAction(action.type, totalDt, { path: action.path });

  return data;
};

