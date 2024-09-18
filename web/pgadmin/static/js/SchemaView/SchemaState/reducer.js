/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
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
export const sessDataReducer = (state, action) => {
  let data = _.cloneDeep(state);
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
    data.__deferred__ = deferredList || [];
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

  case SCHEMA_STATE_ACTIONS.MOVE_ROW:
    rows = _.get(data, action.path)||[];
    var row = rows[action.oldIndex];
    rows.splice(action.oldIndex, 1);
    rows.splice(action.newIndex, 0, row);

    _.set(data, action.path, rows);

    break;

  case SCHEMA_STATE_ACTIONS.CLEAR_DEFERRED_QUEUE:
    data.__deferred__ = [];
    return data;

  case SCHEMA_STATE_ACTIONS.DEFERRED_DEPCHANGE:
    data = getDepChange(action.path, _.cloneDeep(data), state, action);
    break;
  }

  data.__changeId = (data.__changeId || 0) + 1;

  return data;
};

