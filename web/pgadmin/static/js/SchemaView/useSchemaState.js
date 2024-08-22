/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useReducer } from 'react';

import _ from 'lodash';

import { parseApiError } from 'sources/api_instance';
import gettext from 'sources/gettext';

import { DepListener }  from './DepListener';
import {
  getSchemaDataDiff,
  validateSchema,
} from './schemaUtils';


export const SchemaStateContext = React.createContext();

export const SCHEMA_STATE_ACTIONS = {
  INIT: 'init',
  SET_VALUE: 'set_value',
  ADD_ROW: 'add_row',
  DELETE_ROW: 'delete_row',
  MOVE_ROW: 'move_row',
  RERENDER: 'rerender',
  CLEAR_DEFERRED_QUEUE: 'clear_deferred_queue',
  DEFERRED_DEPCHANGE: 'deferred_depchange',
  BULK_UPDATE: 'bulk_update',
};

const getDepChange = (currPath, newState, oldState, action) => {
  if(action.depChange) {
    newState = action.depChange(currPath, newState, {
      type: action.type,
      path: action.path,
      value: action.value,
      oldState: _.cloneDeep(oldState),
      listener: action.listener,
    });
  }
  return newState;
};

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
const sessDataReducer = (state, action) => {
  let data = _.cloneDeep(state);
  let rows, cid, deferredList;
  data.__deferred__ = data.__deferred__ || [];

  switch(action.type) {
  case SCHEMA_STATE_ACTIONS.INIT:
    data = action.payload;
    break;

  case SCHEMA_STATE_ACTIONS.BULK_UPDATE:
    rows = (_.get(data, action.path)||[]);
    rows.forEach((row) => { row[action.id] = false; });
    _.set(data, action.path, rows);
    break;

  case SCHEMA_STATE_ACTIONS.SET_VALUE:
    _.set(data, action.path, action.value);
    // If there is any dep listeners get the changes.
    data = getDepChange(action.path, data, state, action);
    deferredList = getDeferredDepChange(action.path, data, state, action);
    data.__deferred__ = deferredList || [];
    break;

  case SCHEMA_STATE_ACTIONS.ADD_ROW:
    // Create id to identify a row uniquely, usefull when getting diff.
    cid = _.uniqueId('c');
    action.value['cid'] = cid;
    if (action.addOnTop) {
      rows = [].concat(action.value).concat(_.get(data, action.path)||[]);
    } else {
      rows = (_.get(data, action.path)||[]).concat(action.value);
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
    data = getDepChange(action.path, data, state, action);
    break;
  }

  data.__changeId = (data.__changeId || 0) + 1;

  return data;
};

function prepareData(val, createMode=false) {
  if(_.isPlainObject(val)) {
    _.forIn(val, function (el) {
      if (_.isObject(el)) {
        prepareData(el, createMode);
      }
    });
  } else if(_.isArray(val)) {
    val.forEach(function(el) {
      if (_.isPlainObject(el)) {
        /* The each row in collection need to have an id to identify them uniquely
        This helps in easily getting what has changed */
        /* Nested collection rows may or may not have idAttribute.
        So to decide whether row is new or not set, the cid starts with
        nn (not new) for existing rows. Newly added will start with 'c' (created)
        */
        el['cid'] = createMode ? _.uniqueId('c') : _.uniqueId('nn');
        prepareData(el, createMode);
      }
    });
  }
  return val;
}

const LOADING_STATE = {
  INIT: 'initializing',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'Error'
};

export class SchemaState extends DepListener {

  constructor(
    schema, getInitData, immutableData, mode, keepCid, onDataChange
  ) {
    super();

    ////// Helper variables

    // BaseUISchema instance
    this.schema = schema;
    // Current mode of operation ('create', 'edit', 'properties')
    this.mode = mode;
    // Keep the 'cid' object during diff calculations.
    this.keepcid = keepCid;
    // Initialization callback
    this.getInitData = getInitData;
    // Data change callback
    this.onDataChange = onDataChange;

    ////// State variables

    // Is is ready to be consumed?
    this.isReady = false;
    // Diff between the current snapshot and initial data.
    this.changes = null;
    // Loading message (if any)
    this.message = null;
    // Current Loading state
    this.loadingState = LOADING_STATE.INIT;
    this.hasChanges = false;

    ////// Schema instance data

    // Initial data after the ready state
    this.initData = {};
    // Current state of the data
    this.data = {};
    // Immutable data
    this.immutableData = immutableData;
    // Current error
    this.errors = {};
    // Pre-ready queue
    this.preReadyQueue = [];

    this._id = Date.now();
  }

  setError(err) {
    this.errors = err;
  }

  setReady(state) {
    this.isReady = state;
  }

  setLoadingState(loadingState) {
    this.loadingState = loadingState;
  }

  setLoadingMessage(msg) {
    this.message = msg;
  }

  // Initialise the data, and fetch the data from the backend (if required).
  // 'force' flag can be used for reloading the data from the backend.
  initialise(dataDispatch, force) {
    let state = this;

    // Don't attempt to initialize again (if it's already in progress).
    if (
      state.loadingState !== LOADING_STATE.INIT ||
      (force && state.loadingState === LOADING_STATE.LOADING)
    ) return;

    state.setLoadingState(LOADING_STATE.LOADING);
    state.setLoadingMessage(gettext('Loading...'));

    /*
     * Fetch the data using getInitData(..) callback.
     * `getInitData(..)` must be present in 'edit' mode.
     */
    if(state.mode === 'edit' && !state.getInitData) {
      throw new Error('getInitData must be passed for edit');
    }

    const initDataPromise = state.getInitData?.() ||
      Promise.resolve({});

    initDataPromise.then((data) => {
      data = data || {};

      if(state.mode === 'edit') {
        // Set the origData to incoming data, useful for comparing.
        state.initData = prepareData({...data, ...state.immutableData});
      } else {
        // In create mode, merge with defaults.
        state.initData = prepareData({
          ...state.schema.defaults, ...data, ...state.immutableData
        }, true);
      }

      state.schema.initialise(state.initData);

      dataDispatch({
        type: SCHEMA_STATE_ACTIONS.INIT,
        payload: state.initData,
      });

      state.setLoadingState(LOADING_STATE.LOADED);
      state.setLoadingMessage('');
      state.setReady(true);
    }).catch((err) => {
      state.setLoadingMessage('');
      state.setError({
        name: 'apierror',
        response: err,
        message: _.escape(parseApiError(err)),
      });
      state.setLoadingState(LOADING_STATE.ERROR);
      state.setReady(true);
    });
  }

  validate(sessData) {
    let state = this,
      schema = state.schema;

    // If schema does not have the data or does not have any 'onDataChange'
    // callback, there is no need to validate the current data.
    if(!state.isReady) return;

    if(
      !validateSchema(schema, sessData, (path, message) => {
        message && state.setError({ name: path, message: _.escape(message) });
      })
    ) state.setError({});

    state.data = sessData;
    state.changes = state.Changes();
    state.onDataChange && state.onDataChange(state.hasChanges, state.changes);
  }

  Changes(includeSkipChange=false) {
    const state = this;
    const sessData = this.data;
    const schema = state.schema;

    // Check if anything changed.
    let dataDiff = getSchemaDataDiff(
      schema, state.initData, sessData,
      state.mode, state.keepCid, false, includeSkipChange
    );
    state.hasChanges = Object.keys(dataDiff).length > 0;

    // Inform the callbacks about change in the data.
    if(state.mode !== 'edit') {
      // Merge the changed data with origData in 'create' mode.
      dataDiff = _.assign({}, state.initData, dataDiff);

      // Remove internal '__changeId' attribute.
      delete dataDiff.__changeId;

      // In case of 'non-edit' mode, changes are always there.
      return dataDiff;
    } else if (state.hasChanges) {
      const idAttr = schema.idAttribute;
      const idVal = state.initData[idAttr];
      // Append 'idAttr' only if it actually exists
      if (idVal) dataDiff[idAttr] = idVal;

      return dataDiff;
    }

    return {};
  }

  get isNew() {
    return this.schema.isNew(this.initData);
  }

  set isNew(val) {
    throw new Error('Property \'isNew\' is readonly.', val);
  }

  get isDirty() {
    return this.hasChanges;
  }

  set isDirty(val) {
    throw new Error('Property \'isDirty\' is readonly.', val);
  }
}

export const useSchemaState = ({
  schema, getInitData, immutableData, mode, keepCid, onDataChange,
}) => {
  let schemaState = schema.state;

  if (!schemaState) {
    schemaState = new SchemaState(
      schema, getInitData, immutableData, mode, keepCid, onDataChange
    );
    schema.state = schemaState;
  }

  const [sessData, sessDispatch] = useReducer(
    sessDataReducer, {...(_.cloneDeep(schemaState.data)), __changeId: 0}
  );

  const sessDispatchWithListener = (action) => {
    let dispatchPayload = {
      ...action,
      depChange: (...args) => schemaState.getDepChange(...args),
      deferredDepChange: (...args) => schemaState.getDeferredDepChange(...args),
    };
    /*
     * All the session changes coming before init should be queued up.
     * They will be processed later when form is ready.
     */
    let preReadyQueue = schemaState.preReadyQueue;

    preReadyQueue ?
      preReadyQueue.push(dispatchPayload) :
      sessDispatch(dispatchPayload);
  };

  schemaState.setUnpreparedData = (path, value) => {
    if(path) {
      let data = prepareData(value);
      _.set(schema.initData, path, data);
      sessDispatchWithListener({
        type: SCHEMA_STATE_ACTIONS.SET_VALUE,
        path: path,
        value: data,
      });
    }
  };

  const resetData = () => {
    const initData = _.cloneDeep(schemaState.initData);
    initData.__changeId = sessData.__changeId;
    sessDispatch({
      type: SCHEMA_STATE_ACTIONS.INIT,
      payload: initData,
    });
  };

  const reload = () => {
    schemaState.initialise(sessDispatch, true);
  };

  useEffect(() => {
    schemaState.initialise(sessDispatch);
  }, [schemaState.loadingState]);

  useEffect(() => {
    let preReadyQueue = schemaState.preReadyQueue;

    if (!schemaState.isReady || !preReadyQueue) return;

    for (const payload  of preReadyQueue) {
      sessDispatch(payload);
    }

    // Destroy the queue so that no one uses it.
    schemaState.preReadyQueue = null;
  }, [schemaState.isReady]);

  useEffect(() => {
    // Validate the schema on the change of the data.
    schemaState.validate(sessData);
  }, [schemaState.isReady, sessData.__changeId]);

  useEffect(() => {
    const items = sessData.__deferred__ || [];

    if (items.length == 0) return;

    sessDispatch({
      type: SCHEMA_STATE_ACTIONS.CLEAR_DEFERRED_QUEUE,
    });

    items.forEach((item) => {
      item.promise.then((resFunc) => {
        sessDispatch({
          type: SCHEMA_STATE_ACTIONS.DEFERRED_DEPCHANGE,
          path: item.action.path,
          depChange: item.action.depChange,
          listener: {
            ...item.listener,
            callback: resFunc,
          },
        });
      });
    });
  }, [sessData.__deferred__?.length]);

  schemaState.reload = reload;
  schemaState.reset = resetData;

  return {
    schemaState,
    dataDispatch: sessDispatchWithListener,
    sessData,
    reset: resetData,
  };
};
