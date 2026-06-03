/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';

import { parseApiError } from 'sources/api_instance';
import gettext from 'sources/gettext';

import { prepareData } from '../common';
import { DepListener }  from '../DepListener';
import { FIELD_OPTIONS, pathOverlaps, schemaOptionsEvalulator } from '../options';
import { count, measure } from '../perf';

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

    this.optionStore = createStore({}, 'option');
    this.dataStore = createStore({}, 'data');
    this.stateStore = createStore({
      isNew: true, isDirty: false, isReady: false,
      isSaving: false, errors: {},
      message: '',
    }, 'state');

    // Memoize the path using flatPathGenerator
    this.__pathGenerator = flatPathGenerator(PATH_SEPARATOR);

    this._id = Date.now();
  }

  updateOptions(changedPath, depDestsArg) {
    return measure('SchemaState.updateOptions', () => {
      const prev = this.optionStore.getState();

      // Caller (SchemaState.validate) may pre-compute depDests; otherwise
      // we collect them here. Pull in any DepListener entries whose source
      // overlaps the changedPath. Their dest paths must also be visited
      // so cross-row declared deps still re-evaluate options.
      const depDests = depDestsArg !== undefined
        ? depDestsArg
        : this._collectDepDestsForPath(changedPath);

      // Schemas can opt themselves into incremental option evaluation
      // by setting `incrementalOptions = true` on the instance. Fold
      // that into viewHelperProps so the evaluator's opt-in check sees
      // it without each dialog opener needing to plumb it through.
      const vhp = (
        this.viewHelperProps?.incrementalOptions !== true
        && this.schema?.incrementalOptions === true
      )
        ? { ...this.viewHelperProps, incrementalOptions: true }
        : this.viewHelperProps;

      // Walker returns a NEW options tree built via structural sharing:
      // unvisited collection rows keep their previous object references
      // (so path-subscribers can short-circuit on Object.is downstream),
      // visited subtrees are fresh objects. No more upfront cloneDeep of
      // the whole tree.
      const next = schemaOptionsEvalulator({
        schema: this.schema, data: this.data, prevOptions: prev,
        viewHelperProps: vhp,
        changedPath, depDests,
      });

      this.optionStore.setState(next);
    });
  }

  _collectDepDestsForPath(changedPath) {
    if (!Array.isArray(changedPath)) return null;
    const listeners = this._depListeners || [];
    if (listeners.length === 0) return null;
    const dests = [];
    for (const entry of listeners) {
      if (!entry?.source || !entry?.dest) continue;
      if (pathOverlaps(entry.source, changedPath)) dests.push(entry.dest);
    }
    return dests;
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
    return measure('SchemaState.validate', () => {
      let state = this,
        schema = state.schema;

      // If schema does not have the data or does not have any 'onDataChange'
      // callback, there is no need to validate the current data.
      if(!state.isReady) return;

      // Read+consume the changedPath set by the dispatcher (if any). On
      // initial mount / INIT / external triggers, this is undefined and
      // both validateSchema and updateOptions fall back to a full walk.
      const changedPath = state.__lastChangedPath;
      state.__lastChangedPath = undefined;

      // Build the must-visit list once and share it between validateSchema
      // and updateOptions. Includes:
      //   - changedPath
      //   - DepListener dest paths whose source overlaps changedPath
      //   - the current error path (so an erroring row is always
      //     re-validated and the error eventually clears when fixed)
      // null mustVisit = full walk semantics for non-opt-in dialogs.
      const incremental = (
        (state.viewHelperProps?.incrementalOptions === true
         || state.schema?.incrementalOptions === true
         || (typeof window !== 'undefined' && window.__INCREMENTAL_OPTIONS__ === true))
        && Array.isArray(changedPath)
      );
      const depDests = state._collectDepDestsForPath(changedPath);
      let mustVisit = null;
      if (incremental) {
        mustVisit = [changedPath].concat(Array.isArray(depDests) ? depDests : []);
        const errPath = state.errors?.name;
        if (Array.isArray(errPath)) mustVisit.push(errPath);
      }

      let errorsSet = 0;
      const hadError = validateSchema(schema, sessData, (path, message) => {
        if (!message) return;
        errorsSet++;
        measure('SchemaState.validate.setError', () => state.setError({
          name: state.accessPath(path), message: _.escape(message)
        }));
      }, [], null, mustVisit);
      count('SchemaState.validate.setErrorCalls', errorsSet);
      if (!hadError) {
        measure('SchemaState.validate.clearError',
          () => state.setError({}));
      }

      measure('SchemaState.validate.dataAssign',
        () => { state.data = sessData; });
      state._changes = state.changes();

      state.updateOptions(changedPath, depDests);

      if (state.onDataChange) {
        measure('SchemaState.validate.onDataChange',
          () => state.onDataChange(state.isDirty, state._changes, state.errors));
      }
    });
  }

  changes(includeSkipChange=false) {
    return measure('SchemaState.changes', () => this._changesImpl(includeSkipChange));
  }

  _changesImpl(includeSkipChange=false) {
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

  accessPath(path, key) {
    return this.__pathGenerator.cached(
      _.isUndefined(key) ? path : path.concat(key)
    );
  }

  value(path) {
    if (!path?.length) return this.data;
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
