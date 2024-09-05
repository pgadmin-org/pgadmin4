/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useEffect, useReducer } from 'react';
import _ from 'lodash';

import { prepareData } from '../common';
import {
  SCHEMA_STATE_ACTIONS,
  SchemaState,
  sessDataReducer,
} from '../SchemaState';


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

  state.reload = reload;
  state.reset = resetData;

  return {
    schemaState: state,
    dataDispatch: sessDispatchWithListener,
    reset: resetData,
  };
};
