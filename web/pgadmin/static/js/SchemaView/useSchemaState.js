/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, {
  useEffect, useMemo, useReducer, useRef, useState,
} from 'react';
import diffArray from 'diff-arrays-of-objects';
import _ from 'lodash';
import gettext from 'sources/gettext';
import { useIsMounted } from '../custom_hooks';
import { parseApiError } from '../api_instance';
import BaseUISchema from './base_schema.ui';
import DepListener  from './DepListener';
import { isModeSupportedByField, isObjectEqual, isValueEqual } from './utils';
import {
  minMaxValidator, numberValidator, integerValidator, emptyValidator,
  checkUniqueCol, isEmptyString
} from '../validators';


export const SchemaStateContext = React.createContext();


function getCollectionDiffInEditMode(
  field, origVal, sessVal, keepCid, parseChanges
) {
  let change = {};

  const id = field.id;
  const collIdAttr = field.schema.idAttribute;
  const origColl = _.get(origVal, id) || [];
  const sessColl = _.get(sessVal, id) || [];
  /*
   * Use 'diffArray' package to get the array diff and extract the
   * info. 'cid' attribute is used to identify the rows uniquely.
   */
  const changeDiff = diffArray(
    origColl, sessColl || [], 'cid', { compareFunction: isObjectEqual }
  );

  if(changeDiff.added.length > 0) {
    change['added'] = cleanCid(changeDiff.added, keepCid);
  }

  if(changeDiff.removed.length > 0) {
    change['deleted'] = cleanCid(changeDiff.removed.map((row) => {
      // Deleted records must be from the original data, not the newly added.
      return _.find(_.get(origVal, field.id), ['cid', row.cid]);
    }), keepCid);
  }

  if(changeDiff.updated.length > 0) {
    /*
     * There is a change in collection. Parse further deep to figure
     * out the exact details.
     */
    let changed = [];

    for(const changedRow of changeDiff.updated) {
      const rowIndxSess = _.findIndex(
        _.get(sessVal, id), (row) => (row.cid === changedRow.cid)
      );
      const rowIndxOrig = _.findIndex(
        _.get(origVal, id), (row) => (row.cid==changedRow.cid)
      );
      const finalChangedRow = parseChanges(
        field.schema, _.get(origVal, [id, rowIndxOrig]),
        _.get(sessVal, [id, rowIndxSess])
      );

      if(_.isEmpty(finalChangedRow)) {
        continue;
      }

      /*
       * If the 'id' attribute value is present, then only changed keys
       * can be passed. Otherwise, passing all the keys is useful.
       */
      const idAttrValue = _.get(sessVal, [id, rowIndxSess, collIdAttr]);

      if(_.isUndefined(idAttrValue)) {
        changed.push({ ...changedRow, ...finalChangedRow });
      } else {
        changed.push({ [collIdAttr]: idAttrValue, ...finalChangedRow });
      }
    }

    if(changed.length > 0) {
      change['changed'] = cleanCid(changed, keepCid);
    }
  }

  return change;
}

function getSchemaDataDiff(
  topSchema, sessData, mode, keepCid, stringify=false, includeSkipChange=true
) {
  const isEditMode = mode === 'edit';

  // This will be executed recursively as data can be nested.
  let parseChanges = (schema, origVal, sessVal) => {
    let levelChanges = {};
    parseChanges.depth =
      _.isUndefined(parseChanges.depth) ? 0 : (parseChanges.depth + 1);

    /* The comparator and setter */
    const attrChanged = (id, change, force=false) => {
      if(isValueEqual(_.get(origVal, id), _.get(sessVal, id)) && !force) {
        return;
      }

      change = change || _.get(sessVal, id);

      if(stringify && (_.isArray(change) || _.isObject(change))) {
        change = JSON.stringify(change);
      }

      /*
       * Null values are not passed in URL params, pass it as an empty string.
       * Nested values does not need this.
       */
      if(_.isNull(change) && parseChanges.depth === 0) {
        change = '';
      }

      levelChanges[id] = change;
    };

    schema.fields.forEach((field) => {
      /*
       * If skipChange is true, then field will not be considered for changed
       * data. This is helpful when 'Save' or 'Reset' should not be enabled on
       * this field change alone. No change in other behaviour.
       */
      if(field.skipChange && !includeSkipChange) return;

      /*
       * At this point the schema assignments like top may not have been done,
       * so - check if mode is supported by this field, or not.
       */
      if (!isModeSupportedByField(field, {mode})) return;

      if(
        typeof(field.type) === 'string' && field.type.startsWith('nested-')
      ) {
        /*
         * Even if its nested, state is on same hierarchical level.
         * Find the changes and merge.
         */
        levelChanges = {
          ...levelChanges,
          ...parseChanges(field.schema, origVal, sessVal),
        };
      } else if(isEditMode && !_.isEqual(
        _.get(origVal, field.id), _.get(sessVal, field.id)
      )) {
        /*
         * Check for changes only if in edit mode, otherwise - everything can
         * go through comparator
         */
        if(field.type === 'collection') {
          const change = getCollectionDiffInEditMode(
            field, origVal, sessVal, keepCid, parseChanges
          );

          if(Object.keys(change).length > 0) {
            attrChanged(field.id, change, true);
          }
        } else {
          attrChanged(field.id);
        }
      } else if(!isEditMode) {
        if(field.type === 'collection') {
          const origColl = _.get(origVal, field.id) || [];
          const sessColl = _.get(sessVal, field.id) || [];

          let changeDiff = diffArray(
            origColl, sessColl, 'cid', {compareFunction: isObjectEqual}
          );

          // Check the updated changes,when:
          // 1. These are the fixed rows.
          // 2. 'canReorder' flag is set to true.
          if((
            !_.isUndefined(field.fixedRows) && changeDiff.updated.length > 0
          ) || (
            _.isUndefined(field.fixedRows) && (
              changeDiff.added.length > 0 || changeDiff.removed.length > 0 ||
              changeDiff.updated.length > 0
            )
          ) || (
            field.canReorder && _.differenceBy(origColl, sessColl, 'cid')
          )) {
            attrChanged(
              field.id, cleanCid(_.get(sessVal, field.id), keepCid), true
            );
            return;
          }

          if(field.canReorder) {
            changeDiff = diffArray(origColl, sessColl);

            if(changeDiff.updated.length > 0) {
              attrChanged(
                field.id, cleanCid(_.get(sessVal, field.id), keepCid), true
              );
            }
          }
        } else {
          attrChanged(field.id);
        }
      }
    });

    parseChanges.depth--;
    return levelChanges;
  };

  return parseChanges(topSchema, topSchema.origData, sessData);
}

function validateCollectionSchema(
  field, sessData, accessPath, setError
) {
  const rows = sessData[field.id] || [];
  const currPath = accessPath.concat(field.id);

  // Validate duplicate rows.
  const dupInd = checkUniqueCol(rows, field.uniqueCol);

  if(dupInd > 0) {
    const uniqueColNames = _.filter(
      field.schema.fields, (uf) => field.uniqueCol.indexOf(uf.id) > -1
    ).map((uf)=>uf.label).join(', ');

    if (isEmptyString(field.label)) {
      setError(currPath, gettext('%s must be unique.', uniqueColNames));
    } else {
      setError(
        currPath,
        gettext('%s in %s must be unique.', uniqueColNames, field.label)
      );
    }
    return true;
  }

  // Loop through data.
  for(const [rownum, row] of rows.entries()) {
    if(validateSchema(
      field.schema, row, setError, currPath.concat(rownum), field.label
    )) {
      return true;
    }
  }

  return false;
}

function validateSchema(
  schema, sessData, setError, accessPath=[], collLabel=null
) {
  sessData = sessData || {};

  for(const field of schema.fields) {
    // Skip id validation
    if(schema.idAttribute === field.id) {
      continue;
    }

    // If the field is has nested schema, then validate the child schema.
    if(field.schema && (field.schema instanceof BaseUISchema)) {
      // A collection is an array.
      if(field.type === 'collection') {
        if (validateCollectionSchema(field, sessData, accessPath, setError))
          return true;
      }
      // A nested schema ? Recurse
      else if(validateSchema(field.schema, sessData, setError, accessPath)) {
        return true;
      }
    } else {
      // Normal field, default validations.
      const value = sessData[field.id];

      let message = null;
      let validators = [];

      if(field.noEmpty) {
        const label = (
          collLabel && gettext('%s in %s', field.label, collLabel)
        ) || field.noEmptyLabel || field.label;

        validators.push[emptyValidator.bind(null, label, value)];
      }

      if(field.type === 'int') {
        validators.push[integerValidator.bind(null, field.label, value)];
        validators.push[
          minMaxValidator(null, field.label, value, field.min, field.max)
        ];
      } else if(field.type === 'numeric') {
        validators.push[numberValidator.bind(null, field.label, value)];
        validators.push[
          minMaxValidator(null, field.label, value, field.min, field.max)
        ];
      }

      for (const validator in validators) {
        message = validator();

        if (message) {
          setError(accessPath.concat(field.id), message);
          return true;
        }
      }
    }
  }

  return schema.validate(
    sessData, (id, message) => setError(accessPath.concat(id), message)
  );
}

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

const getDeferredDepChange = (currPath, newState, oldState, action)=>{
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
    break;

  case SCHEMA_STATE_ACTIONS.DEFERRED_DEPCHANGE:
    data = getDepChange(action.path, data, state, action);
    break;

  }
  return data;
};

// Remove cid key added by prepareData
const cleanCid = (coll, keepCid=false) => (
  (!coll || keepCid) ? coll : coll.map(
    (o) => _.pickBy(o, (v, k) => (k !== 'cid'))
  )
);

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

export default function useSchemaState({
  schema, getInitData, immutableData, mode, keepCid, resetKey,
  setLoadingMessage, onDataChange,
}) {
  immutableData = immutableData || {};

  const res = useMemo(() => ({
    state: null,
  }), [resetKey, immutableData]);

  const [loadinState, setLoadingState] = useState(LOADING_STATE.INIT);
  const depListener = useRef(new DepListener());
  const [errors, setError] = useState({});
  const isNew = schema.isNew(schema.origData);
  const checkIsMounted = useIsMounted();

  const [isDirty, setDirty] = useState(false);
  const [isReady, setReady] = useState(false);
  const preReadyQueue = useRef([]);

  const changes = useRef(null);

  // Schema data
  const [sessData, sessDispatch] = useReducer(sessDataReducer, {});

  setLoadingMessage = setLoadingMessage || (() => { /* Do nothing */ });

  // Dispatch all the actions recorded before it was ready.
  useEffect(() => {
    if(isReady) {
      if(preReadyQueue.current.length > 0) {
        for (const payload  of preReadyQueue.current) {
          sessDispatch(payload);
        }
      }
      // Destroy the queue so that no one uses it.
      preReadyQueue.current = undefined;
    }
  }, [isReady]);

  // Validate the schema on the change of the data.
  useEffect(() => {
    // If schema does not have the data or does not have any 'onDataChange'
    // callback, there is no need to validate the current data.
    if(!isReady || !onDataChange) return;

    if(
      !validateSchema(schema, sessData, (path, message) => {
        message && setError({ name: path, message: _.escape(message) });
      })
    ) setError({});

    // Check if anything changed.
    let dataDiff = getSchemaDataDiff(
      schema, sessData, mode, keepCid, false, false
    );
    const hasDataChanged = Object.keys(dataDiff).length > 0;
    setDirty(hasDataChanged);

    // Inform the callbacks about change in the data.
    if(mode !== 'edit') {
      // Merge the changed data with origData in 'create' mode.
      dataDiff = _.assign({}, schema.origData, dataDiff);
    } else {
      dataDiff[schema.idAttribute] = schema.origData[schema.idAttribute];
    }
    changes.current = hasDataChanged ? dataDiff : null;

    onDataChange?.(hasDataChanged, dataDiff);
  }, [sessData, isReady]);

  useEffect(() => {
    if(sessData.__deferred__?.length > 0) {
      const items = sessData.__deferred__;

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
    }
  }, [sessData.__deferred__?.length]);

  useEffect(() => {
    if (loadinState !== LOADING_STATE.INIT) return;
    setLoadingState(LOADING_STATE.LOADING);
    setLoadingMessage(gettext('Loading...'));


    /*
     * Fetch the data using getInitData(..) callback.
     * `getInitData(..)` must be present in 'edit' mode.
     */
    if(mode === 'edit' && !getInitData) {
      throw new Error('getInitData must be passed for edit');
    }

    const initDataPromise = getInitData?.() || Promise.resolve({});

    initDataPromise.then((data) => {
      data = data || {};

      if(mode === 'edit') {
        // Set the origData to incoming data, useful for comparing.
        schema.origData = prepareData({...(data || {}), ...immutableData});
      } else {
        // In create mode, merge with defaults.
        schema.origData = prepareData({
          ...schema.defaults,
          ...data,
          ...immutableData,
        }, true);
      }
      schema.initialise(schema.origData);

      // Let's wait for the component to mount first.
      if(!checkIsMounted()) return;

      setReady(true);
      setLoadingMessage('');
      sessDispatch({
        type: SCHEMA_STATE_ACTIONS.INIT,
        payload: schema.origData,
      });
      setLoadingState(LOADING_STATE.LOADED);
    }).catch((err) => {
      setReady(true);
      setError({
        name: 'apierror',
        response: err,
        message: _.escape(parseApiError(err)),
      });
      if(!checkIsMounted()) return;
      setLoadingMessage('');
      setLoadingState(LOADING_STATE.ERROR);
    });
  }, [immutableData]);

  useEffect(() => {
    // If reset key changes, reset the form.
    schema.initialise(schema.origData);
    sessDispatch({
      type: SCHEMA_STATE_ACTIONS.INIT,
      payload: schema.origData,
    });
  }, [resetKey]);

  const sessDispatchWithListener = (action) => {
    let dispatchPayload = {
      ...action,
      depChange: (...args) => depListener.current.getDepChange(...args),
      deferredDepChange:
      (...args) => depListener.current.getDeferredDepChange(...args),
    };
    /*
     * All the session changes coming before init should be queued up.
     * They will be processed later when form is ready.
     */
    preReadyQueue.current ?
      preReadyQueue.current.push(dispatchPayload) :
      sessDispatch(dispatchPayload);
  };

  // Set the _sessData, can be usefull to some deep controls.
  schema._sessData = sessData;

  if (res.state !== null) return res.state;

  // Schema state
  res.state = {
    dataDispatch: sessDispatchWithListener,
    initOrigData: (path, value) => {
      if(path) {
        let data = prepareData(value);
        _.set(schema.origData, path, data);
        sessDispatchWithListener({
          type: SCHEMA_STATE_ACTIONS.SET_VALUE,
          path: path,
          value: data,
        });
      }
    },
    depListener: depListener,
    changes: changes,
    sessData,
    errors,
    isDirty,
    isReady,
    isNew,
    setError,
  };

  return res.state;
}
