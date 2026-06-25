/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useEffect, useReducer } from 'react';
import _ from 'lodash';
import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';

import { prepareData } from '../common';
import {
  SCHEMA_STATE_ACTIONS,
  SchemaState,
  sessDataReducer,
} from '../SchemaState';

/**
 * Drain a list of deferred-dep queue items.
 *
 * Each item is `{action, promise, listener}` produced by
 * `DepListener.getDeferredDepChange`. We wait for each promise to settle
 * and then dispatch a DEFERRED_DEPCHANGE action carrying the resolved
 * callback. Two protocol guards:
 *
 *   1. The resolved value MUST be a function (the callback that returns
 *      the data delta). If it's anything else, we warn and skip — this
 *      catches the common protocol mistake of resolving with a data
 *      object directly.
 *   2. Rejected promises surface to the user through
 *      `pgAdmin.Browser.notifier.error` so a backend failure can't
 *      leave the dialog in a half-applied state with no feedback.
 *      Schemas that want graceful in-place recovery should resolve
 *      with a reset callback rather than rejecting.
 *
 * Exported so it can be unit-tested without rendering a full SchemaView.
 */
export const drainDeferredQueue = (items, dispatch) => {
  items.forEach((item) => {
    Promise.resolve(item.promise).then(
      (resFunc) => {
        if (typeof resFunc !== 'function') {
          // Protocol violation: the schema author resolved with
          // something other than a (tmpstate) => deltaObj callback.
          // Loud console.error so it trips dev/QA test suites; not a
          // notifier toast because this is a code bug, not a runtime
          // failure the end user can act on.
          console.error(
            'deferredDepChange promise must resolve to a callback function; '
            + 'got %o. The dispatch is skipped — see useSchemaState '
            + 'drainDeferredQueue for the protocol.',
            resFunc,
          );
          return;
        }
        dispatch({
          type: SCHEMA_STATE_ACTIONS.DEFERRED_DEPCHANGE,
          path: item.action.path,
          depChange: item.action.depChange,
          listener: {
            ...item.listener,
            callback: resFunc,
          },
        });
      },
      (err) => {
        const msg = err?.message || String(err) || 'unknown error';
        const userMsg = gettext('Dependent update failed: ') + msg;
        const notifier = pgAdmin?.Browser?.notifier;
        if (typeof notifier?.error === 'function') {
          notifier.error(userMsg);
        } else {
          // Notifier unavailable (very early init, isolated test
          // harness, etc.). Surface to console.error rather than
          // silently dropping the rejection — the latter is the bug
          // this drainer exists to prevent.
          console.error('deferredDepChange:', userMsg, err);
        }
      },
    );
  });
};


export const useSchemaState = ({
  schema, getInitData, immutableData, onDataChange, viewHelperProps,
  loadingText,
}) => {

  if (!schema)
    return {
      schemaState: null,
      dataDispatch: null,
      reset: null,
    };

  let state = schema.state;

  if (!state) {
    schema.state = state = new SchemaState(
      schema, getInitData, immutableData, onDataChange, viewHelperProps,
      loadingText,
    );
    state.updateOptions();
  }

  const [sessData, sessDispatch] = useReducer(
    sessDataReducer, {...(_.cloneDeep(state.data)), __changeId: 0}
  );

  const sessDispatchWithListener = (action) => {
    let dispatchPayload = {
      ...action,
      depChange: (...args) => state.getDepChange(...args),
      deferredDepChange: (...args) => state.getDeferredDepChange(...args),
    };
    /*
     * All the session changes coming before init should be queued up.
     * They will be processed later when form is ready.
     */
    let preReadyQueue = state.preReadyQueue;

    preReadyQueue ?
      preReadyQueue.push(dispatchPayload) :
      sessDispatch(dispatchPayload);
  };

  state.setUnpreparedData = (path, value) => {
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
    const initData = _.cloneDeep(state.initData);
    initData.__changeId = sessData.__changeId;
    sessDispatch({
      type: SCHEMA_STATE_ACTIONS.INIT,
      payload: initData,
    });
  };

  const reload = () => {
    state.initialise(sessDispatch, true);
  };

  useEffect(() => {
    state.initialise(sessDispatch);
  }, [state.loadingState]);

  useEffect(() => {
    let preReadyQueue = state.preReadyQueue;

    if (!state.isReady || !preReadyQueue) return;

    for (const payload  of preReadyQueue) {
      sessDispatch(payload);
    }

    // Destroy the queue so that no one uses it.
    state.preReadyQueue = null;
  }, [state.isReady]);

  useEffect(() => {
    // Validate the schema on the change of the data.
    if (state.isReady) state.validate(sessData);
  }, [state.isReady, sessData.__changeId]);

  useEffect(() => {
    const items = sessData.__deferred__ || [];

    if (items.length == 0) return;

    sessDispatch({
      type: SCHEMA_STATE_ACTIONS.CLEAR_DEFERRED_QUEUE,
    });

    drainDeferredQueue(items, sessDispatch);
    // Depend on the array reference rather than its length. With React
    // automatic batching the queue's length can round-trip through 0 in
    // the same commit (CLEAR followed by a fresh APPEND), and a
    // length-based dep would compare equal across renders and miss the
    // second drain. The reducer creates a new __deferred__ array on
    // every dispatch, so ref-equality changes whenever the queue does;
    // the early `length == 0` return keeps the no-op case free.
  }, [sessData.__deferred__]);

  state.reload = reload;
  state.reset = resetData;

  return {
    schemaState: state,
    dataDispatch: sessDispatchWithListener,
    reset: resetData,
  };
};
