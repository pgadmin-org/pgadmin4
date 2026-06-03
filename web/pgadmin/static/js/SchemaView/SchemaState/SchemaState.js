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

// Soft cap on the _knownErrorPaths LRU. Empirically a complex form
// (TableSchema in edit mode w/ 100 columns, each with 4 sub-fields)
// touches ~400 error paths over a long session; 1024 leaves comfortable
// headroom while making the worst-case mustVisit traversal bounded.
const KNOWN_ERROR_PATHS_CAP = 1024;

// `map.__capWarned` is set the first time eviction fires for a given
// tracker so the warn doesn't repeat for the same dialog. Per-Map
// (not module-level) so each new SchemaState resets the flag — a
// long-lived ERD session can still see the warn when a freshly
// opened sub-dialog hits the cap.
const addKnownErrorPath = (map, flat, path) => {
  if (map.has(flat)) {
    // Refresh recency: delete + re-insert so this entry moves to
    // the end of the insertion-order traversal (used as LRU).
    map.delete(flat);
  } else if (map.size >= KNOWN_ERROR_PATHS_CAP) {
    // Evict the oldest entry. JS Map iterates in insertion order.
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
    // Telemetry: surface via the perf-counter infrastructure so the
    // perf overlay shows total evictions per session, and emit a
    // one-shot console.warn under canary builds so a developer who
    // hits the cap actually notices. If a real session hits this
    // repeatedly, the cap may need raising; without a signal there's
    // no way to know.
    count('SchemaState.knownErrorPaths.evictions');
    if (process.env.__CANARY_BUILD__ && !map.__capWarned) {
      map.__capWarned = true;
       
      console.warn(
        '[schemaview] _knownErrorPaths LRU cap '
        + `(${KNOWN_ERROR_PATHS_CAP}) hit; oldest error paths are `
        + 'being evicted. If the dialog is short-lived this is fine; '
        + 'if it persists across many edits, raise the cap.'
      );
    }
  }
  map.set(flat, path);
};

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

    // Tracks every path that has reported a validation error during
    // this state's lifetime, keyed by flat path string. Used to build
    // mustVisit so incremental validation never silently drops a row
    // that was previously known to be invalid. Map (not Set) so we
    // preserve the original path array for re-injection into
    // mustVisit. Entries are kept across validates — even if a row
    // clears its error, leaving it in the set means future dispatches
    // re-check it cheaply, which catches re-errors without a full walk.
    //
    // Bounded by KNOWN_ERROR_PATHS_CAP so long-lived dialogs (ERD,
    // schema diff, etc.) don't leak. JS Map preserves insertion order,
    // so the oldest entry is keys().next().value — evict that when
    // we'd exceed the cap. Eviction is safe: a dropped path either
    // (a) is no longer dirty, in which case the next full walk picks
    // it up anyway, or (b) is still dirty, in which case the user's
    // next dispatch on that path re-adds it via the changedPath
    // route.
    this._knownErrorPaths = new Map();

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

      // Incremental is the default now. The schema instance can opt
      // OUT by setting `incrementalOptions = false`; propagate that
      // through viewHelperProps so the walker (which only reads vhp)
      // sees it. Explicit viewHelperProps wins if the dialog opener
      // already set the flag either way.
      let vhp = this.viewHelperProps;
      if (this.schema?.incrementalOptions === false
          && vhp?.incrementalOptions !== false) {
        vhp = { ...vhp, incrementalOptions: false };
      } else if (this.schema?.incrementalOptions === true
                 && vhp?.incrementalOptions !== true) {
        // Back-compat: legacy schemas that explicitly opted IN keep
        // working even if the default ever shifts back.
        vhp = { ...vhp, incrementalOptions: true };
      }

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
    // Mirror the assignment into _knownErrorPaths so any caller —
    // including external code that constructs an error directly — feeds
    // the multi-path tracker. Without this, callers that bypass the
    // validate() callback (e.g. test fixtures that pre-seed an error)
    // wouldn't get the row revisited under incremental mustVisit.
    if (err && Array.isArray(err.name) && err.name.length > 0) {
      const flat = err.name.map((p) => String(p)).join(PATH_SEPARATOR);
      addKnownErrorPath(this._knownErrorPaths, flat, [...err.name]);
    }
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

      // Read+consume the changedPaths set by the dispatcher. React
      // batches multiple dispatches into one validate cycle, so we
      // accumulate every path that landed in this batch (see
      // useSchemaState.sessDispatchWithListener). The first path is
      // the "primary" changedPath threaded through updateOptions; any
      // additional paths join depDests so the walker treats them as
      // must-visit. On initial mount / INIT / external triggers, the
      // array is empty and both validateSchema and updateOptions fall
      // back to a full walk.
      const pendingPaths = Array.isArray(state.__pendingChangedPaths)
        ? state.__pendingChangedPaths : [];
      state.__pendingChangedPaths = [];
      // Back-compat: existing tests and any external callers may still
      // set the legacy single-path field. Treat it as one pending path
      // when the accumulator is empty.
      if (pendingPaths.length === 0 && state.__lastChangedPath) {
        pendingPaths.push(state.__lastChangedPath);
      }
      state.__lastChangedPath = undefined;
      const changedPath = pendingPaths[0];
      const extraChangedPaths = pendingPaths.slice(1);

      // Build the must-visit list once and share it between validateSchema
      // and updateOptions. Includes:
      //   - changedPath
      //   - DepListener dest paths whose source overlaps changedPath
      //   - EVERY path that has ever reported an error during this
      //     state's lifetime (state._knownErrorPaths). Without this,
      //     incremental validation could silently miss a row that was
      //     previously invalid: the per-validate short-circuit means
      //     only ONE error path was visible at a time, and the old
      //     `state.errors.name` tracker only held that one. A row that
      //     erroried but was eclipsed by an earlier short-circuit
      //     would never be re-validated until a changedPath happened
      //     to overlap it.
      // Incremental walks are now the DEFAULT: any dispatch with a
      // concrete changedPath gets the pruned walk. Opt-out paths
      // remain available for the (rare) dialog that needs full-walk
      // semantics; an explicit `false` on viewHelperProps, the schema
      // instance, or the global window flag disables it.
      const incremental = (
        Array.isArray(changedPath)
        && state.viewHelperProps?.incrementalOptions !== false
        && state.schema?.incrementalOptions !== false
        && (typeof window === 'undefined'
            || window.__INCREMENTAL_OPTIONS__ !== false)
      );
      // Collect depDests for the primary changedPath, then fold any
      // additional batched paths and THEIR depDests into the same
      // list. The walker's mustVisit is a flat union — adding entries
      // here keeps the entire batch correctly visited even though the
      // walker still treats `changedPath` as the primary anchor.
      const primaryDepDests = state._collectDepDestsForPath(changedPath);
      let depDests = primaryDepDests;
      if (extraChangedPaths.length > 0) {
        depDests = Array.isArray(primaryDepDests) ? [...primaryDepDests] : [];
        for (const extra of extraChangedPaths) {
          depDests.push(extra);
          const extraDeps = state._collectDepDestsForPath(extra);
          if (Array.isArray(extraDeps)) {
            for (const d of extraDeps) depDests.push(d);
          }
        }
      }
      let mustVisit = null;
      if (incremental) {
        mustVisit = [changedPath].concat(Array.isArray(depDests) ? depDests : []);
        for (const knownPath of state._knownErrorPaths.values()) {
          mustVisit.push(knownPath);
        }
      }

      // Capture every error reported across the validate walk into
      // the long-lived tracker (Map keyed by flat-path string so
      // duplicates collapse). The displayed error stays the FIRST
      // one — calling state.setError multiple times would otherwise
      // make the UI flicker through every error before settling on
      // the last one. Combined with collectAll=true, the walker
      // reports every error path it discovers; we record them all
      // and surface the first to the UI.
      let errorsSet = 0;
      let firstError = null;
      const hadError = validateSchema(schema, sessData, (path, message) => {
        if (!message) return;
        errorsSet++;
        const flat = (path || []).map((p) => String(p)).join(PATH_SEPARATOR);
        addKnownErrorPath(state._knownErrorPaths, flat, [...path]);
        if (!firstError) firstError = { path, message };
      }, [], null, mustVisit, true);
      count('SchemaState.validate.setErrorCalls', errorsSet);
      if (firstError) {
        measure('SchemaState.validate.setError', () => state.setError({
          name: state.accessPath(firstError.path),
          message: _.escape(firstError.message),
        }));
      } else if (!hadError) {
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
