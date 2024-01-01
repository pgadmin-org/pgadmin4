/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Box, makeStyles, Accordion, AccordionSummary, AccordionDetails} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import SaveIcon from '@material-ui/icons/Save';
import PublishIcon from '@material-ui/icons/Publish';
import DoneIcon from '@material-ui/icons/Done';
import SettingsBackupRestoreIcon from '@material-ui/icons/SettingsBackupRestore';
import CloseIcon from '@material-ui/icons/Close';
import InfoIcon from '@material-ui/icons/InfoRounded';
import HelpIcon from '@material-ui/icons/HelpRounded';
import EditIcon from '@material-ui/icons/Edit';
import diffArray from 'diff-arrays-of-objects';
import _ from 'lodash';
import clsx from 'clsx';

import {FormFooterMessage, MESSAGE_TYPE } from 'sources/components/FormComponents';
import { PrimaryButton, DefaultButton, PgIconButton } from 'sources/components/Buttons';
import Loader from 'sources/components/Loader';
import { minMaxValidator, numberValidator, integerValidator, emptyValidator, checkUniqueCol, isEmptyString} from '../validators';
import { MappedFormControl } from './MappedControl';
import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import FormView, { getFieldMetaData } from './FormView';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';
import { parseApiError } from '../api_instance';
import DepListener, {DepListenerContext} from './DepListener';
import FieldSetView from './FieldSetView';
import DataGridView from './DataGridView';
import { useIsMounted } from '../custom_hooks';
import ErrorBoundary from '../helpers/ErrorBoundary';
import { usePgAdmin } from '../BrowserComponent';
import { PgButtonGroup } from '../components/Buttons';

const useDialogStyles = makeStyles((theme)=>({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  form: {
    flexGrow: 1,
    position: 'relative',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  formProperties: {
    backgroundColor: theme.palette.grey[400],
  },
  footer: {
    padding: theme.spacing(1),
    background: theme.otherVars.headerBg,
    display: 'flex',
    zIndex: 1010,
    ...theme.mixins.panelBorder.top,
  },
  mappedControl: {
    paddingBottom: theme.spacing(1),
  },
  buttonMargin: {
    marginRight: '0.5rem',
  },
}));

export const StateUtilsContext = React.createContext();

function getForQueryParams(data) {
  let retData = {...data};
  Object.keys(retData).forEach((key)=>{
    let value = retData[key];
    if(_.isObject(value) || _.isNull(value)) {
      retData[key] = JSON.stringify(value);
    }
  });
  return retData;
}

/* Compare the sessData with schema.origData
schema.origData is set to incoming or default data
*/
function isValueEqual(val1, val2) {
  let attrDefined = !_.isUndefined(val1) && !_.isUndefined(val2) && !_.isNull(val1) && !_.isNull(val2);

  /* If the orig value was null and new one is empty string, then its a "no change" */
  /* If the orig value and new value are of different datatype but of same value(numeric) "no change" */
  /* If the orig value is undefined or null and new value is boolean false "no change" */
  if (_.isEqual(val1, val2)
  || ((val1 === null || _.isUndefined(val1)) && val2 === '')
  || ((val1 === null || _.isUndefined(val1)) && typeof(val2) === 'boolean' && !val2)
  || (attrDefined ? (!_.isObject(val1) && _.isEqual(val1.toString(), val2.toString())) : false)
  ) {
    return true;
  }
  return false;
}

/* Compare two objects */
function isObjectEqual(val1, val2) {
  const allKeys = Array.from(new Set([...Object.keys(val1), ...Object.keys(val2)]));
  return !allKeys.some((k)=>{
    return !isValueEqual(val1[k], val2[k]);
  });
}

function getChangedData(topSchema, viewHelperProps, sessData, stringify=false, includeSkipChange=true) {
  let changedData = {};
  let isEdit = viewHelperProps.mode === 'edit';

  /* Will be called recursively as data can be nested */
  const parseChanges = (schema, origVal, sessVal)=>{
    let levelChanges = {};
    parseChanges.depth = _.isUndefined(parseChanges.depth) ? 0 : parseChanges.depth+1;

    /* The comparator and setter */
    const attrChanged = (id, change, force=false)=>{
      if(isValueEqual(_.get(origVal, id), _.get(sessVal, id)) && !force) {
        return;
      } else {
        change = change || _.get(sessVal, id);
        if(stringify && (_.isArray(change) || _.isObject(change))) {
          change = JSON.stringify(change);
        }
        /* Null values are not passed in URL params, pass it as an empty string
        Nested values does not need this */
        if(_.isNull(change) && parseChanges.depth === 0) {
          change = '';
        }
        return levelChanges[id] = change;
      }
    };

    schema.fields.forEach((field)=>{
      /* At this point the schema assignments like top may not have been done
      So, only check the mode by passing true to getFieldMetaData */
      let {modeSupported} = getFieldMetaData(field, schema, {}, viewHelperProps, true);

      /* If skipChange is true, then field will not be considered for changed data,
      This is helpful when Save or Reset should not be enabled on this field change alone.
      No change in other behaviour */
      if(!modeSupported || (field.skipChange && !includeSkipChange)) {
        return;
      }
      if(typeof(field.type) == 'string' && field.type.startsWith('nested-')) {
        /* Even if its nested, state is on same hierarchical level.
        Find the changes and merge */
        levelChanges = {
          ...levelChanges,
          ...parseChanges(field.schema, origVal, sessVal),
        };
      } else {
        /* Check for changes only if its in edit mode, otherwise everything can go through comparator */
        if(isEdit && !_.isEqual(_.get(origVal, field.id), _.get(sessVal, field.id))) {
          let change = null;
          if(field.type === 'collection') {
            /* Use diffArray package to get the array diff and extract the info.
            cid is used to identify the rows uniquely */
            const changeDiff = diffArray(
              _.get(origVal, field.id) || [],
              _.get(sessVal, field.id) || [],
              'cid',
              {
                compareFunction: isObjectEqual,
              }
            );
            change = {};
            if(changeDiff.added.length > 0) {
              change['added'] = cleanCid(changeDiff.added, viewHelperProps.keepCid);
            }
            if(changeDiff.removed.length > 0) {
              change['deleted'] = cleanCid(changeDiff.removed.map((row)=>{
                /* Deleted records should be original, not the changed */
                return _.find(_.get(origVal, field.id), ['cid', row.cid]);
              }), viewHelperProps.keepCid);
            }
            if(changeDiff.updated.length > 0) {
              /* There is change in collection. Parse further to go deep */
              let changed = [];
              for(const changedRow of changeDiff.updated) {
                let finalChangedRow = {};
                let rowIndxSess = _.findIndex(_.get(sessVal, field.id), (r)=>r.cid==changedRow.cid);
                let rowIndxOrig = _.findIndex(_.get(origVal, field.id), (r)=>r.cid==changedRow.cid);
                finalChangedRow = parseChanges(field.schema, _.get(origVal, [field.id, rowIndxOrig]), _.get(sessVal, [field.id, rowIndxSess]));

                if(_.isEmpty(finalChangedRow)) {
                  continue;
                }
                /* If the id attr value is present, then only changed keys can be passed.
                Otherwise, passing all the keys is useful */
                let idAttrValue = _.get(sessVal, [field.id, rowIndxSess, field.schema.idAttribute]);
                if(_.isUndefined(idAttrValue)) {
                  changed.push({
                    ...changedRow,
                    ...finalChangedRow,
                  });
                } else {
                  changed.push({
                    [field.schema.idAttribute]: idAttrValue,
                    ...finalChangedRow,
                  });
                }
              }
              if(changed.length > 0) {
                change['changed'] = cleanCid(changed, viewHelperProps.keepCid);
              }
            }
            if(Object.keys(change).length > 0) {
              attrChanged(field.id, change, true);
            }
          } else {
            attrChanged(field.id);
          }
        } else if(!isEdit) {
          if(field.type === 'collection') {
            const origColl = _.get(origVal, field.id) || [];
            const sessColl = _.get(sessVal, field.id) || [];
            let changeDiff = diffArray(origColl,sessColl,'cid',{
              compareFunction: isObjectEqual,
            });

            /* For fixed rows, check only the updated changes */
            /* If canReorder, check the updated changes */
            if((!_.isUndefined(field.fixedRows) && changeDiff.updated.length > 0)
              || (_.isUndefined(field.fixedRows) && (
                changeDiff.added.length > 0 || changeDiff.removed.length > 0 || changeDiff.updated.length > 0
              ))
              || (field.canReorder && _.differenceBy(origColl, sessColl, 'cid'))
            ) {
              let change = cleanCid(_.get(sessVal, field.id), viewHelperProps.keepCid);
              attrChanged(field.id, change, true);
              return;
            }

            if(field.canReorder) {
              changeDiff = diffArray(origColl,sessColl);
              if(changeDiff.updated.length > 0) {
                let change = cleanCid(_.get(sessVal, field.id), viewHelperProps.keepCid);
                attrChanged(field.id, change, true);
              }
            }
          } else {
            attrChanged(field.id);
          }
        }
      }
    });

    parseChanges.depth--;
    return levelChanges;
  };

  changedData = parseChanges(topSchema, topSchema.origData, sessData);
  return changedData;
}

function validateSchema(schema, sessData, setError, accessPath=[], collLabel=null) {
  sessData = sessData || {};
  for(let field of schema.fields) {
    /* Skip id validation */
    if(schema.idAttribute == field.id) {
      continue;
    }
    /* If the field is has nested schema then validate the schema */
    if(field.schema && (field.schema instanceof BaseUISchema)) {
      /* A collection is an array */
      if(field.type === 'collection') {
        let rows = sessData[field.id] || [];
        let currPath = accessPath.concat(field.id);

        /* Validate duplicate rows */
        let dupInd = checkUniqueCol(rows, field.uniqueCol);
        if(dupInd > 0) {
          let uniqueColNames = _.filter(field.schema.fields, (uf)=>field.uniqueCol.indexOf(uf.id) > -1)
            .map((uf)=>uf.label).join(', ');
          if (isEmptyString(field.label)) {
            setError(currPath, gettext('%s must be unique.', uniqueColNames));
          } else {
            setError(currPath, gettext('%s in %s must be unique.', uniqueColNames, field.label));
          }
          return true;
        }
        /* Loop through data */
        for(const [rownum, row] of rows.entries()) {
          if(validateSchema(field.schema, row, setError, currPath.concat(rownum), field.label)) {
            return true;
          }
        }
      } else {
        /* A nested schema ? Recurse */
        if(validateSchema(field.schema, sessData, setError, accessPath)) {
          return true;
        }
      }
    } else {
      /* Normal field, default validations */
      let value = sessData[field.id];
      let message = null;
      if(field.noEmpty) {
        let label = field.label;
        if(collLabel) {
          label = gettext('%s in %s', field.label, collLabel);
        }
        if(field.noEmptyLabel) {
          label = field.noEmptyLabel;
        }
        message = emptyValidator(label, value);
      }
      if(!message && (field.type == 'int' || field.type == 'numeric')) {
        message = minMaxValidator(field.label, value, field.min, field.max);
      }
      if(!message && field.type == 'int') {
        message = integerValidator(field.label, value);
      } else if(!message && field.type == 'numeric') {
        message = numberValidator(field.label, value);
      }
      if(message) {
        setError(accessPath.concat(field.id), message);
        return true;
      }
    }
  }
  return schema.validate(sessData, (id, message)=>setError(accessPath.concat(id), message));
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

const getDepChange = (currPath, newState, oldState, action)=>{
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

/* The main function which manipulates the session state based on actions */
/*
The state is managed based on path array of a particular key
For Eg. if the state is
{
  key1: {
    ckey1: [
      {a: 0, b: 0},
      {a: 1, b: 1}
    ]
  }
}
The path for b in first row will be [key1, ckey1, 0, b]
The path for second row of ckey1 will be [key1, ckey1, 1]
The path for key1 is [key1]
The state starts with path []
*/
const sessDataReducer = (state, action)=>{
  let data = _.cloneDeep(state);
  let rows, cid, deferredList;
  data.__deferred__ = data.__deferred__ || [];
  switch(action.type) {
  case SCHEMA_STATE_ACTIONS.INIT:
    data = action.payload;
    break;
  case SCHEMA_STATE_ACTIONS.BULK_UPDATE:
    rows = (_.get(data, action.path)||[]);
    rows.forEach((row)=> {
      row[action.id] = false;
    });
    _.set(data, action.path, rows);
    break;
  case SCHEMA_STATE_ACTIONS.SET_VALUE:
    _.set(data, action.path, action.value);
    /* If there is any dep listeners get the changes */
    data = getDepChange(action.path, data, state, action);
    deferredList = getDeferredDepChange(action.path, data, state, action);
    data.__deferred__ = deferredList || [];
    break;
  case SCHEMA_STATE_ACTIONS.ADD_ROW:
    /* Create id to identify a row uniquely, usefull when getting diff */
    cid = _.uniqueId('c');
    action.value['cid'] = cid;
    if (action.addOnTop) {
      rows = [].concat(action.value).concat(_.get(data, action.path)||[]);
    } else {
      rows = (_.get(data, action.path)||[]).concat(action.value);
    }
    _.set(data, action.path, rows);
    /* If there is any dep listeners get the changes */
    data = getDepChange(action.path, data, state, action);
    break;
  case SCHEMA_STATE_ACTIONS.DELETE_ROW:
    rows = _.get(data, action.path)||[];
    rows.splice(action.value, 1);
    _.set(data, action.path, rows);
    /* If there is any dep listeners get the changes */
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

/* Remove cid key added by prepareData */
function cleanCid(coll, keepCid=false) {
  if(!coll || keepCid) {
    return coll;
  }
  return coll.map((o)=>_.pickBy(o, (v, k)=>k!='cid'));
}

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

/* If its the dialog */
function SchemaDialogView({
  getInitData, viewHelperProps, loadingText, schema={}, showFooter=true, isTabView=true, checkDirtyOnEnableSave=false, ...props}) {
  const classes = useDialogStyles();
  /* Some useful states */
  const [dirty, setDirty] = useState(false);
  /* formErr has 2 keys - name and message.
  Footer message will be displayed if message is set.
  */
  const pgAdmin = usePgAdmin();
  const [formErr, setFormErr] = useState({});
  const [loaderText, setLoaderText] = useState('');
  const [saving, setSaving] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const firstEleRef = useRef();
  const isNew = schema.isNew(schema.origData);
  const checkIsMounted = useIsMounted();
  const preFormReadyQueue = useRef([]);
  const Notifier = props.Notifier || pgAdmin.Browser.notifier;

  const depListenerObj = useRef(new DepListener());
  /* The session data */
  const [sessData, sessDispatch] = useReducer(sessDataReducer, {});

  useEffect(()=>{
    /* Dispatch all the actions recorded before form ready */
    if(formReady) {
      if(preFormReadyQueue.current.length > 0) {
        for (const dispatchPayload  of preFormReadyQueue.current) {
          sessDispatch(dispatchPayload);
        }
      }
      /* destroy the queue so that no one uses it */
      preFormReadyQueue.current = undefined;
    }
  }, [formReady]);

  useEffect(()=>{
    /* if sessData changes, validate the schema */
    if(!formReady) return;
    let isNotValid = validateSchema(schema, sessData, (path, message)=>{
      if(message) {
        setFormErr({
          name: path,
          message: _.escape(message),
        });
      }
    });
    if(!isNotValid) setFormErr({});

    /* check if anything changed */
    let changedData = getChangedData(schema, viewHelperProps, sessData, false, false);
    let isDataChanged = Object.keys(changedData).length > 0;
    setDirty(isDataChanged);

    /* tell the callbacks the data has changed */
    if(viewHelperProps.mode !== 'edit') {
      /* If new then merge the changed data with origData */
      changedData = _.assign({}, schema.origData, changedData);
    }

    props.onDataChange && props.onDataChange(isDataChanged, changedData);
  }, [sessData, formReady]);

  useEffect(()=>{
    if(sessData.__deferred__?.length > 0) {
      let items = sessData.__deferred__;
      sessDispatch({
        type: SCHEMA_STATE_ACTIONS.CLEAR_DEFERRED_QUEUE,
      });

      items.forEach((item)=>{
        item.promise.then((resFunc)=>{
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

  useEffect(()=>{
    let unmounted = false;
    /* Docker on load focusses itself, so our focus should execute later */
    let focusTimeout = setTimeout(()=>{
      firstEleRef.current && firstEleRef.current.focus();
    }, 250);

    setLoaderText('Loading...');
    /* Get the initial data using getInitData */
    /* If its an edit mode, getInitData should be present and a promise */
    if(!getInitData && viewHelperProps.mode === 'edit') {
      throw new Error('getInitData must be passed for edit');
    }
    let initDataPromise = (getInitData && getInitData()) || Promise.resolve({});
    initDataPromise.then((data)=>{
      if(unmounted) {
        return;
      }
      data = data || {};
      if(viewHelperProps.mode === 'edit') {
        /* Set the origData to incoming data, useful for comparing and reset */
        schema.origData = prepareData(data || {});
      } else {
        /* In create mode, merge with defaults */
        schema.origData = prepareData({
          ...schema.defaults,
          ...data,
        }, true);
      }
      schema.initialise(schema.origData);
      sessDispatch({
        type: SCHEMA_STATE_ACTIONS.INIT,
        payload: schema.origData,
      });
      setFormReady(true);
      setLoaderText('');
    }).catch((err)=>{
      if(unmounted) {
        return;
      }
      setLoaderText('');
      setFormErr({
        name: 'apierror',
        message: _.escape(parseApiError(err)),
      });
    });
    /* Clear the focus timeout if unmounted */
    return ()=>{
      unmounted = true;
      clearTimeout(focusTimeout);
    };
  }, []);

  useEffect(()=>{
    /* If reset key changes, reset the form */
    sessDispatch({
      type: SCHEMA_STATE_ACTIONS.INIT,
      payload: schema.origData,
    });
    return true;
  }, [props.resetKey]);

  const onResetClick = ()=>{
    const resetIt = ()=>{
      firstEleRef.current && firstEleRef.current.focus();
      setFormResetKey((prev)=>prev+1);
      sessDispatch({
        type: SCHEMA_STATE_ACTIONS.INIT,
        payload: schema.origData,
      });
      return true;
    };
    /* Confirm before reset */
    if(props.confirmOnCloseReset) {
      Notifier.confirm(
        gettext('Warning'),
        gettext('Changes will be lost. Are you sure you want to reset?'),
        resetIt,
        function() {
          return true;
        },
      );
    } else {
      resetIt();
    }
  };

  const onSaveClick = ()=>{
    setSaving(true);
    setLoaderText('Saving...');
    /* Get the changed data */
    let changeData = getChangedData(schema, viewHelperProps, sessData);

    /* Add the id when in edit mode */
    if(viewHelperProps.mode !== 'edit') {
      /* If new then merge the changed data with origData */
      changeData = _.assign({}, schema.origData, changeData);
    } else {
      changeData[schema.idAttribute] = schema.origData[schema.idAttribute];
    }
    if (schema.warningText) {
      Notifier.confirm(
        gettext('Warning'),
        schema.warningText,
        ()=> {
          save(changeData);
        },
        () => {
          setSaving(false);
          setLoaderText('');
          return true;
        },
      );
    } else {
      save(changeData);
    }
  };

  const save = (changeData) => {
    props.onSave(isNew, changeData)
      .then(()=>{
        if(schema.informText) {
          Notifier.alert(
            gettext('Warning'),
            schema.informText,
          );
        }
      }).catch((err)=>{
        console.error(err);
        setFormErr({
          name: 'apierror',
          message: _.escape(parseApiError(err)),
        });
      }).finally(()=>{
        if(checkIsMounted()) {
          setSaving(false);
          setLoaderText('');
        }
      });
  };

  const onErrClose = useCallback(()=>{
    /* Unset the error message, but not the name */
    setFormErr((prev)=>({
      ...prev,
      message: '',
    }));
  });

  const getSQLValue = ()=>{
    /* Called when SQL tab is active */
    if(dirty) {
      if(!formErr.name) {
        let changeData = getChangedData(schema, viewHelperProps, sessData);
        if(viewHelperProps.mode !== 'edit') {
          /* If new then merge the changed data with origData */
          changeData = _.assign({}, schema.origData, changeData);
        } else {
          changeData[schema.idAttribute] = schema.origData[schema.idAttribute];
        }
        /* Call the passed incoming getSQLValue func to get the SQL
        return of getSQLValue should be a promise.
        */
        return props.getSQLValue(isNew, getForQueryParams(changeData));
      } else {
        return Promise.resolve('-- ' + gettext('Definition incomplete.'));
      }
    } else {
      return Promise.resolve('-- ' + gettext('No updates.'));
    }
  };

  const sessDispatchWithListener = (action)=>{
    let dispatchPayload = {
      ...action,
      depChange: (...args)=>depListenerObj.current.getDepChange(...args),
      deferredDepChange: (...args)=>depListenerObj.current.getDeferredDepChange(...args),
    };
    /* All the session changes coming before init should be queued up
    They will be processed later when form is ready.
    */
    if(preFormReadyQueue.current) {
      preFormReadyQueue.current.push(dispatchPayload);
      return;
    }
    sessDispatch(dispatchPayload);
  };

  const stateUtils = useMemo(()=>({
    dataDispatch: sessDispatchWithListener,
    initOrigData: (path, value)=>{
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
    formResetKey: formResetKey,
    formErr: formErr,
  }), [formResetKey, formErr]);

  const getButtonIcon = () => {
    if(props.customSaveBtnIconType == 'upload') {
      return <PublishIcon />;
    } else if(props.customSaveBtnIconType == 'done') {
      return <DoneIcon />;
    }
    return <SaveIcon />;
  };

  let ButtonIcon = getButtonIcon();
  /* Set the _sessData, can be usefull to some deep controls */
  schema._sessData = sessData;

  /* I am Groot */
  return (
    <StateUtilsContext.Provider value={stateUtils}>
      <DepListenerContext.Provider value={depListenerObj.current}>
        <Box className={classes.root}>
          <Box className={classes.form}>
            <Loader message={loaderText || loadingText}/>
            <FormView value={sessData} viewHelperProps={viewHelperProps}
              schema={schema} accessPath={[]} dataDispatch={sessDispatchWithListener}
              hasSQLTab={props.hasSQL} getSQLValue={getSQLValue} firstEleRef={firstEleRef} isTabView={isTabView} className={props.formClassName} />
            <FormFooterMessage type={MESSAGE_TYPE.ERROR} message={formErr.message}
              onClose={onErrClose} />
          </Box>
          {showFooter && <Box className={classes.footer}>
            {(!props.disableSqlHelp || !props.disableDialogHelp) && <Box>
              <PgIconButton data-test="sql-help" onClick={()=>props.onHelp(true, isNew)} icon={<InfoIcon />}
                disabled={props.disableSqlHelp} className={classes.buttonMargin} title="SQL help for this object type."/>
              <PgIconButton data-test="dialog-help" onClick={()=>props.onHelp(false, isNew)} icon={<HelpIcon />} title="Help for this dialog."
                disabled={props.disableDialogHelp}/>
            </Box>}
            <Box marginLeft="auto">
              <DefaultButton data-test="Close" onClick={props.onClose} startIcon={<CloseIcon />} className={classes.buttonMargin}>
                {gettext('Close')}
              </DefaultButton>
              <DefaultButton data-test="Reset" onClick={onResetClick} startIcon={<SettingsBackupRestoreIcon />} disabled={!dirty || saving} className={classes.buttonMargin}>
                {gettext('Reset')}
              </DefaultButton>
              <PrimaryButton data-test="Save" onClick={onSaveClick} startIcon={ButtonIcon} disabled={ !(viewHelperProps.mode === 'edit' || checkDirtyOnEnableSave ? dirty : true) || saving || Boolean(formErr.name && formErr.name !== 'apierror') || !formReady}>
                {props.customSaveBtnName ? gettext(props.customSaveBtnName) : gettext('Save')}
              </PrimaryButton>
            </Box>
          </Box>}
        </Box>
      </DepListenerContext.Provider>
    </StateUtilsContext.Provider>
  );
}

SchemaDialogView.propTypes = {
  getInitData: PropTypes.func,
  viewHelperProps: PropTypes.shape({
    mode: PropTypes.string.isRequired,
    serverInfo: PropTypes.shape({
      type: PropTypes.string,
      version: PropTypes.number,
    }),
    inCatalog: PropTypes.bool,
  }).isRequired,
  loadingText: PropTypes.string,
  schema: CustomPropTypes.schemaUI,
  onSave: PropTypes.func,
  onClose: PropTypes.func,
  onHelp: PropTypes.func,
  onDataChange: PropTypes.func,
  confirmOnCloseReset: PropTypes.bool,
  isTabView: PropTypes.bool,
  hasSQL: PropTypes.bool,
  getSQLValue: PropTypes.func,
  disableSqlHelp: PropTypes.bool,
  disableDialogHelp: PropTypes.bool,
  showFooter: PropTypes.bool,
  resetKey: PropTypes.any,
  customSaveBtnName: PropTypes.string,
  customSaveBtnIconType: PropTypes.string,
  formClassName: CustomPropTypes.className,
  Notifier: PropTypes.object,
  checkDirtyOnEnableSave: PropTypes.bool,
};

const usePropsStyles = makeStyles((theme)=>({
  root: {
    height: '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column'
  },
  controlRow: {
    marginBottom: theme.spacing(1),
  },
  form: {
    padding: theme.spacing(1),
    overflow: 'auto',
    flexGrow: 1,
  },
  toolbar: {
    padding: theme.spacing(1),
    background: theme.palette.background.default,
    ...theme.mixins.panelBorder.bottom,
  },
  buttonMargin: {
    marginRight: '0.5rem',
  },
  noPadding: {
    padding: 0,
  }
}));

/* If its the properties tab */
function SchemaPropertiesView({
  getInitData, viewHelperProps, schema={}, updatedData, ...props}) {
  const classes = usePropsStyles();
  let defaultTab = 'General';
  let tabs = {};
  let tabsClassname = {};
  let groupLabels = {};
  const [origData, setOrigData] = useState({});
  const [loaderText, setLoaderText] = useState('');
  const checkIsMounted = useIsMounted();
  const pgAdmin = usePgAdmin();

  useEffect(()=>{
    setLoaderText('Loading...');
    getInitData().then((data)=>{
      data = data || {};
      schema.initialise(data);
      if(checkIsMounted()) {
        setOrigData({
          ...data,
          ...updatedData
        });
        setLoaderText('');
      }
    }).catch((err)=>{
      setLoaderText('');
      pgAdmin.Browser.notifier.pgRespErrorNotify(err);
    });
  }, []);

  useEffect(()=>{
    if(updatedData) {
      setOrigData(prevData => ({
        ...prevData,
        ...updatedData
      }));
    }
  },[updatedData]);

  /* A simple loop to get all the controls for the fields */
  schema.fields.forEach((field)=>{
    let {group} = field;
    let {visible, disabled, readonly, modeSupported} = getFieldMetaData(field, schema, origData, viewHelperProps);
    group = group || defaultTab;

    if(field.isFullTab) {
      tabsClassname[group] = classes.noPadding;
    }

    if(modeSupported) {
      group = groupLabels[group] || group || defaultTab;
      if(field.helpMessageMode && field.helpMessageMode.indexOf(viewHelperProps.mode) == -1) {
        field.helpMessage = '';
      }

      if(!tabs[group]) tabs[group] = [];
      if(field && field.type === 'nested-fieldset') {
        tabs[group].push(
          <FieldSetView
            key={`nested${tabs[group].length}`}
            value={origData}
            viewHelperProps={viewHelperProps}
            schema={field.schema}
            accessPath={[]}
            controlClassName={classes.controlRow}
            {...field}
            visible={visible}
          />
        );
      } else if(field.type === 'collection') {
        tabs[group].push(
          <DataGridView
            key={field.id}
            viewHelperProps={viewHelperProps}
            name={field.id}
            value={origData[field.id] || []}
            schema={field.schema}
            accessPath={[field.id]}
            formErr={{}}
            containerClassName={classes.controlRow}
            canAdd={false}
            canEdit={false}
            canDelete={false}
            visible={visible}
          />
        );
      } else if(field.type === 'group') {
        groupLabels[field.id] = field.label;
        if(!visible) {
          schema.filterGroups.push(field.label);
        }
      } else {
        tabs[group].push(
          <MappedFormControl
            key={field.id}
            viewHelperProps={viewHelperProps}
            state={origData}
            name={field.id}
            value={origData[field.id]}
            {...field}
            readonly={readonly}
            disabled={disabled}
            visible={visible}
            className={field.isFullTab ? null : classes.controlRow}
            noLabel={field.isFullTab}
            memoDeps={[
              origData[field.id],
              classes.controlRow,
              field.isFullTab
            ]}
          />
        );
      }
    }
  });

  let finalTabs = _.pickBy(tabs, (v, tabName)=>schema.filterGroups.indexOf(tabName) <= -1);
  return (
    <Box className={classes.root}>
      <Loader message={loaderText}/>
      <Box className={classes.toolbar}>
        <PgButtonGroup size="small">
          <PgIconButton
            data-test="help" onClick={()=>props.onHelp(true, false)} icon={<InfoIcon />} disabled={props.disableSqlHelp}
            title="SQL help for this object type." />
          <PgIconButton data-test="edit"
            onClick={props.onEdit} icon={<EditIcon />} title={gettext('Edit object...')} />
        </PgButtonGroup>
      </Box>
      <Box className={clsx(classes.form, classes.formProperties)}>
        <Box>
          {Object.keys(finalTabs).map((tabName)=>{
            let id = tabName.replace(' ', '');
            return (
              <Accordion key={id}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`${id}-content`}
                  id={`${id}-header`}
                >
                  {tabName}
                </AccordionSummary>
                <AccordionDetails className={tabsClassname[tabName]}>
                  <Box style={{width: '100%'}}>
                    {finalTabs[tabName]}
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

SchemaPropertiesView.propTypes = {
  getInitData: PropTypes.func.isRequired,
  updatedData: PropTypes.object,
  viewHelperProps: PropTypes.shape({
    mode: PropTypes.string.isRequired,
    serverInfo: PropTypes.shape({
      type: PropTypes.string,
      version: PropTypes.number,
    }),
    inCatalog: PropTypes.bool,
  }).isRequired,
  schema: CustomPropTypes.schemaUI,
  onHelp: PropTypes.func,
  disableSqlHelp: PropTypes.bool,
  onEdit: PropTypes.func,
  itemNodeData: PropTypes.object
};

export default function SchemaView({formType, ...props}) {
  /* Switch the view based on formType */
  if(formType === 'tab') {
    return (
      <ErrorBoundary>
        <SchemaPropertiesView {...props}/>
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary>
      <SchemaDialogView {...props}/>
    </ErrorBoundary>
  );
}

SchemaView.propTypes = {
  formType: PropTypes.oneOf(['tab', 'dialog']),
};
