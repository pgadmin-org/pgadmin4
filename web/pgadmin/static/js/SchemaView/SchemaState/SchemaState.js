/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';

import { parseApiError } from 'sources/api_instance';
import gettext from 'sources/gettext';

import { prepareData } from '../common';
import { DepListener }  from '../DepListener';
import { FIELD_OPTIONS, schemaOptionsEvalulator } from '../options';

import {
  SCHEMA_STATE_ACTIONS,
  flatPathGenerator,
  getSchemaDataDiff,
  validateSchema,
} from './common';
import { createStore } from './store';


export const LOADING_STATE = {
  INIT: 'initialising',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'Error'
};

const PATH_SEPARATOR = '/';

export class SchemaState extends DepListener {
  constructor(
    schema, getInitData, immutableData, onDataChange, viewHelperProps,
    loadingText
  ) {
    super();

    ////// Helper variables

    // BaseUISchema instance
    this.schema = schema;
    this.viewHelperProps = viewHelperProps;
    // Current mode of operation ('create', 'edit', 'properties')
    this.mode = viewHelperProps.mode;
    // Keep the 'cid' object during diff calculations.
    this.keepcid = viewHelperProps.keepCid;
    // Initialization callback
    this.getInitData = getInitData;
    // Data change callback
    this.onDataChange = onDataChange;

    ////// State variables

    // Diff between the current snapshot and initial data.
    // Internal state for keeping the changes
    this._changes = {};
    // Current Loading state
    this.loadingState = LOADING_STATE.INIT;
    this.customLoadingText = loadingText;

    ////// Schema instance data

    // Initial data after the ready state
    this.initData = {};

    // Immutable data
    this.immutableData = immutableData;
    // Pre-ready queue
    this.preReadyQueue = [];

    this.optionStore = createStore({});
    this.dataStore = createStore({});
    this.stateStore = createStore({
      isNew: true, isDirty: false, isReady: false,
      isSaving: false, errors: {},
      message: '',
    });

    // Memoize the path using flatPathGenerator
    this.__pathGenerator = flatPathGenerator(PATH_SEPARATOR);

    this._id = Date.now();
  }

  updateOptions() {
    let options = _.cloneDeep(this.optionStore.getState());

    schemaOptionsEvalulator({
      schema: this.schema, data: this.data, options: options,
      viewHelperProps: this.viewHelperProps,
    });

    this.optionStore.setState(options);
  }

  setState(state, value) {
    this.stateStore.set((prev) => _.set(prev, [].concat(state), value));
  }

  setError(err) {
    this.setState('errors', err);
  }

  get errors() {
    return this.stateStore.get(['errors']);
  }

  set errors(val) {
    throw new Error('Property \'errors\' is readonly.', val);
  }

  get isReady() {
    return this.stateStore.get(['isReady']);
  }

  setReady(val) {
    this.setState('isReady', val);
  }

  get isSaving() {
    return this.stateStore.get(['isSaving']);
  }

  set isSaving(val) {
    this.setState('isSaving', val);
  }

  get loadingMessage() {
    return this.stateStore.get(['message']);
  }

  setLoadingState(loadingState) {
    this.loadingState = loadingState;
  }

  setMessage(msg) {
    this.setState('message', msg);
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
    state.setMessage(state.customLoadingText || gettext('Loading...'));

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
      state.setMessage('');
      state.setReady(true);
      state.setState('isNew', state.schema.isNew(state.initData));
    }).catch((err) => {
      state.setMessage('');
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
        message && state.setError({
          name: state.accessPath(path), message: _.escape(message)
        });
      })
    ) state.setError({});

    state.data = sessData;
    state._changes = state.changes();
    state.updateOptions();
    state.onDataChange && state.onDataChange(state.isDirty, state._changes);
  }

  changes(includeSkipChange=false) {
    const state = this;
    const sessData = state.data;
    const schema = state.schema;

    // Check if anything changed.
    let dataDiff = getSchemaDataDiff(
      schema, state.initData, sessData,
      state.mode, state.keepCid, false, includeSkipChange
    );

    const isDirty = Object.keys(dataDiff).length > 0;
    state.setState('isDirty', isDirty);


    // Inform the callbacks about change in the data.
    if(state.mode !== 'edit') {
      // Merge the changed data with origData in 'create' mode.
      dataDiff = _.assign({}, state.initData, dataDiff);

      // Remove internal '__changeId' attribute.
      delete dataDiff.__changeId;

      // In case of 'non-edit' mode, changes are always there.
      return dataDiff;
    }

    if (!isDirty) return {};

    const idAttr = schema.idAttribute;
    const idVal = state.initData[idAttr];

    // Append 'idAttr' only if it actually exists
    if (idVal) dataDiff[idAttr] = idVal;

    return dataDiff;
  }

  get isNew() {
    return this.stateStore.get(['isNew']);
  }

  set isNew(val) {
    throw new Error('Property \'isNew\' is readonly.', val);
  }

  get isDirty() {
    return this.stateStore.get(['isDirty']);
  }

  set isDirty(val) {
    throw new Error('Property \'isDirty\' is readonly.', val);
  }

  get data() {
    return this.dataStore.getState();
  }

  set data(_data) {
    this.dataStore.setState(_data);
  }

  accessPath(path=[], key) {
    return this.__pathGenerator.cached(
      _.isUndefined(key) ? path : path.concat(key)
    );
  }

  value(path) {
    if (!path || !path.length) return this.data;
    return _.get(this.data, path);
  }

  options(path) {
    return this.optionStore.get(path.concat(FIELD_OPTIONS));
  }

  state(_state) {
    return _state ?
      this.stateStore.get([].concat(_state)) : this.stateStore.getState();
  }

  subscribe(path, listener, kind='options') {
    switch(kind) {
    case 'options':
      return this.optionStore.subscribeForPath(
        path.concat(FIELD_OPTIONS), listener
      );
    case 'states':
      return this.stateStore.subscribeForPath(path, listener);
    default:
      return this.dataStore.subscribeForPath(path, listener);
    }
  }

  subscribeOption(option, path, listener) {
    return this.optionStore.subscribeForPath(
      path.concat(FIELD_OPTIONS, option), listener
    );
  }

}
