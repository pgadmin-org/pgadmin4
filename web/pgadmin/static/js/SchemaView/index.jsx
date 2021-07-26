/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Box, makeStyles } from '@material-ui/core';
import {Accordion, AccordionSummary, AccordionDetails} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import SaveIcon from '@material-ui/icons/Save';
import SettingsBackupRestoreIcon from '@material-ui/icons/SettingsBackupRestore';
import CloseIcon from '@material-ui/icons/Close';
import InfoIcon from '@material-ui/icons/InfoRounded';
import HelpIcon from '@material-ui/icons/HelpRounded';
import EditIcon from '@material-ui/icons/Edit';
import diffArray from 'diff-arrays-of-objects';
import _ from 'lodash';

import {FormFooterMessage, MESSAGE_TYPE } from 'sources/components/FormComponents';
import Theme from 'sources/Theme';
import { PrimaryButton, DefaultButton, PgIconButton } from 'sources/components/Buttons';
import Loader from 'sources/components/Loader';
import { minMaxValidator, numberValidator, integerValidator, emptyValidator, checkUniqueCol } from '../validators';
import { MappedFormControl } from './MappedControl';
import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import FormView from './FormView';
import { pgAlertify } from '../helpers/legacyConnector';
import { evalFunc } from 'sources/utils';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';
import { parseApiError } from '../api_instance';
import DepListener, {DepListenerContext} from './DepListener';
import FieldSetView from './FieldSetView';

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

function getForQueryParams(data) {
  let retData = {...data};
  Object.keys(retData).forEach((key)=>{
    let value = retData[key];
    if(_.isArray(value) || _.isObject(value)) {
      retData[key] = JSON.stringify(value);
    }
  });
  return retData;
}

/* Compare the sessData with schema.origData
schema.origData is set to incoming or default data
*/
function getChangedData(topSchema, mode, sessData, stringify=false) {
  let changedData = {};
  let isEdit = mode === 'edit';

  /* The comparator and setter */
  const attrChanged = (currPath, change, force=false)=>{
    let origVal = _.get(topSchema.origData, currPath);
    let sessVal = _.get(sessData, currPath);
    let attrDefined = !_.isUndefined(origVal) && !_.isUndefined(sessVal) && !_.isNull(origVal) && !_.isNull(sessVal);

    /* If the orig value was null and new one is empty string, then its a "no change" */
    /* If the orig value and new value are of different datatype but of same value(numeric) "no change" */
    /* If the orig value is undefined or null and new value is boolean false "no change" */
    if ((_.isEqual(origVal, sessVal)
      || ((origVal === null || _.isUndefined(origVal)) && !sessVal)
      || (attrDefined ? _.isEqual(origVal.toString(), sessVal.toString()) : false))
       && !force) {
      return;
    } else {
      change = change || _.get(sessData, currPath);
      if(stringify && (_.isArray(change) || _.isObject(change))) {
        change = JSON.stringify(change);
      }
      _.set(changedData, currPath, change);
    }
  };

  /* Will be called recursively as data can be nested */
  const parseChanges = (schema, accessPath, changedData)=>{
    schema.fields.forEach((field)=>{
      if(typeof(field.type) == 'string' && field.type.startsWith('nested-')) {
        /* its nested */
        parseChanges(field.schema, accessPath, changedData);
      } else {
        let currPath = accessPath.concat(field.id);
        /* Check for changes only if its in edit mode, otherwise everything is changed */
        if(isEdit && !_.isEqual(_.get(topSchema.origData, currPath), _.get(sessData, currPath))) {
          let change = null;
          if(field.type === 'collection') {
            /* Use diffArray package to get the array diff and extract the info
            cid is used to identify the rows uniquely */
            const changeDiff = diffArray(
              _.get(topSchema.origData, currPath) || [],
              _.get(sessData, currPath) || [],
              'cid'
            );
            change = {};
            if(changeDiff.added.length > 0) {
              change['added'] = cleanCid(changeDiff.added);
            }
            if(changeDiff.removed.length > 0) {
              change['deleted'] = cleanCid(changeDiff.removed.map((row)=>{
                /* Deleted records should be original, not the changed */
                return _.find(_.get(topSchema.origData, currPath), ['cid', row.cid]);
              }));
            }
            if(changeDiff.updated.length > 0) {
              change['changed'] = cleanCid(changeDiff.updated);
            }
            if(Object.keys(change).length > 0) {
              attrChanged(currPath, change, true);
            }
          } else {
            attrChanged(currPath);
          }
        } else if(!isEdit) {
          if(field.type === 'collection') {
            let change = cleanCid(_.get(sessData, currPath));
            attrChanged(currPath, change);
          } else {
            attrChanged(currPath);
          }
        }
      }
    });
  };

  parseChanges(topSchema, [], changedData);
  return changedData;
}

function validateSchema(schema, sessData, setError) {
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

        /* Validate duplicate rows */
        let dupInd = checkUniqueCol(rows, field.uniqueCol);
        if(dupInd > 0) {
          let uniqueColNames = _.filter(field.schema.fields, (uf)=>field.uniqueCol.indexOf(uf.id) > -1)
            .map((uf)=>uf.label).join(', ');
          setError(field.uniqueCol[0], gettext('%s in %s must be unique.', uniqueColNames, field.label));
          return true;
        }
        /* Loop through data */
        for(const row of rows) {
          if(validateSchema(field.schema, row, setError)) {
            return true;
          }
        }
      } else {
        /* A nested schema ? Recurse */
        if(validateSchema(field.schema, sessData, setError)) {
          return true;
        }
      }
    } else {
      /* Normal field, default validations */
      let value = sessData[field.id];
      let message = null;
      if(field.noEmpty) {
        message = emptyValidator(field.label, value);
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
        setError(field.id, message);
        return true;
      }
    }
  }
  return schema.validate(sessData, setError);
}

export const SCHEMA_STATE_ACTIONS = {
  INIT: 'init',
  SET_VALUE: 'set_value',
  ADD_ROW: 'add_row',
  DELETE_ROW: 'delete_row',
  RERENDER: 'rerender',
  CLEAR_DEFERRED_QUEUE: 'clear_deferred_queue',
  DEFERRED_DEPCHANGE: 'deferred_depchange',
};

const getDepChange = (currPath, newState, oldState, action)=>{
  if(action.depChange) {
    newState = action.depChange(currPath, newState, {
      type: action.type,
      path: action.path,
      value: action.value,
      oldState: _.cloneDeep(oldState),
      depChangeResolved: action.depChangeResolved,
    });
  }
  return newState;
};

const getDeferredDepChange = (currPath, newState, oldState, action)=>{
  if(action.deferredDepChange) {
    let deferredPromiseList = action.deferredDepChange(currPath, newState, {
      type: action.type,
      path: action.path,
      value: action.value,
      depChange: action.depChange,
      oldState: _.cloneDeep(oldState),
    });
    return deferredPromiseList;
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
  case SCHEMA_STATE_ACTIONS.SET_VALUE:
    _.set(data, action.path, action.value);
    /* If there is any dep listeners get the changes */
    data = getDepChange(action.path, data, state, action);
    deferredList = getDeferredDepChange(action.path, data, state, action);
    // let deferredInfo = getDeferredDepChange(action.path, data, state, action);
    data.__deferred__ = deferredList || [];
    break;
  case SCHEMA_STATE_ACTIONS.ADD_ROW:
    /* Create id to identify a row uniquely, usefull when getting diff */
    cid = _.uniqueId('c');
    action.value['cid'] = cid;
    rows = (_.get(data, action.path)||[]).concat(action.value);
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
function cleanCid(coll) {
  if(!coll) {
    return coll;
  }
  return coll.map((o)=>_.pickBy(o, (v, k)=>k!='cid'));
}

function prepareData(origData) {
  _.forIn(origData, function (val) {
    if (_.isArray(val)) {
      val.forEach(function(el) {
        if (_.isObject(el)) {
          /* The each row in collection need to have an id to identify them uniquely
          This helps in easily getting what has changed */
          /* Nested collection rows may or may not have idAttribute.
          So to decide whether row is new or not set, the cid starts with
          nn (not new) for existing rows. Newly added will start with 'c' (created)
          */
          el['cid'] = _.uniqueId('nn');
          prepareData(el);
        }
      });
    }
    if (_.isObject(val)) {
      prepareData(val);
    }
  });
  return origData;
}

/* If its the dialog */
function SchemaDialogView({
  getInitData, viewHelperProps, schema={}, ...props}) {
  const classes = useDialogStyles();
  /* Some useful states */
  const [dirty, setDirty] = useState(false);
  /* formErr has 2 keys - name and message.
  Footer message will be displayed if message is set.
  */
  const [formErr, setFormErr] = useState({});
  const [loaderText, setLoaderText] = useState('');
  const [saving, setSaving] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const firstEleRef = useRef();
  const isNew = schema.isNew(schema.origData);

  const depListenerObj = useRef(new DepListener());
  /* The session data */
  const [sessData, sessDispatch] = useReducer(sessDataReducer, {});

  useEffect(()=>{
    /* if sessData changes, validate the schema */
    if(!formReady) return;
    /* Set the _sessData, can be usefull to some deep controls */
    schema._sessData = sessData;
    let isNotValid = validateSchema(schema, sessData, (name, message)=>{
      if(message) {
        setFormErr({
          name: name,
          message: message,
        });
      }
    });
    if(!isNotValid) setFormErr({});

    /* check if anything changed */
    let dataChanged = Object.keys(getChangedData(schema, viewHelperProps.mode, sessData)).length > 0;
    setDirty(dataChanged);

    /* tell the callbacks the data has changed */
    props.onDataChange && props.onDataChange(dataChanged);
  }, [sessData]);

  useEffect(()=>{
    if(sessData.__deferred__?.length > 0) {
      sessDispatch({
        type: SCHEMA_STATE_ACTIONS.CLEAR_DEFERRED_QUEUE,
      });

      // let deferredDepChang = sessData.__deferred__[0];
      let item = sessData.__deferred__[0];
      item.promise.then((resFunc)=>{
        sessDispatch({
          type: SCHEMA_STATE_ACTIONS.DEFERRED_DEPCHANGE,
          path: item.action.path,
          depChange: item.action.depChange,
          depChangeResolved: resFunc,
        });
      });
    }
  }, [sessData.__deferred__?.length]);

  useEffect(()=>{
    /* Docker on load focusses itself, so our focus should execute later */
    let focusTimeout = setTimeout(()=>{
      firstEleRef.current && firstEleRef.current.focus();
    }, 250);

    /* Re-triggering focus on already focussed loses the focus */
    if(viewHelperProps.mode === 'edit') {
      setLoaderText('Loading...');
      /* If its an edit mode, get the initial data using getInitData
      getInitData should be a promise */
      if(!getInitData) {
        throw new Error('getInitData must be passed for edit');
      }
      getInitData && getInitData().then((data)=>{firstEleRef.current;
        data = data || {};
        /* Set the origData to incoming data, useful for comparing and reset */
        schema.origData = prepareData(data || {});
        sessDispatch({
          type: SCHEMA_STATE_ACTIONS.INIT,
          payload: schema.origData,
        });
        setFormReady(true);
        setLoaderText('');

      });
    } else {
      /* Use the defaults as the initital data */
      schema.origData = prepareData(schema.defaults);
      sessDispatch({
        type: SCHEMA_STATE_ACTIONS.INIT,
        payload: schema.origData,
      });
      setFormReady(true);
      setLoaderText('');
    }

    /* Clear the focus timeout it unmounted */
    return ()=>clearTimeout(focusTimeout);
  }, []);

  const onResetClick = ()=>{
    const resetIt = ()=>{
      sessDispatch({
        type: SCHEMA_STATE_ACTIONS.INIT,
        payload: schema.origData,
      });
      return true;
    };
    /* Confirm before reset */
    if(props.confirmOnCloseReset) {
      pgAlertify().confirm(
        gettext('Warning'),
        gettext('Changes will be lost. Are you sure you want to reset?'),
        resetIt,
        function() {
          return true;
        }
      ).set('labels', {
        ok: gettext('Yes'),
        cancel: gettext('No'),
      }).show();
    } else {
      resetIt();
    }
  };

  const onSaveClick = ()=>{
    setSaving(true);
    setLoaderText('Saving...');
    /* Get the changed data */
    let changeData = getChangedData(schema, viewHelperProps.mode, sessData);

    /* Add the id when in edit mode */
    if(viewHelperProps.mode !== 'edit') {
      /* If new then merge the changed data with origData */
      changeData = _.assign({}, schema.origData, changeData);
    } else {
      changeData[schema.idAttribute] = schema.origData[schema.idAttribute];
    }
    if (schema.warningText) {
      pgAlertify().confirm(
        gettext('Warning'),
        schema.warningText,
        ()=> {
          save(changeData);
        },
        () => {
          setSaving(false);
          setLoaderText('');
          return true;
        }
      );
    } else {
      save(changeData);
    }
  };

  const save = (changeData) => {
    props.onSave(isNew, changeData)
      .then(()=>{
        if(schema.informText) {
          pgAlertify().alert(
            gettext('Warning'),
            schema.informText,
          );
        }
      }).catch((err)=>{
        setFormErr({
          name: 'apierror',
          message: parseApiError(err),
        });
      }).finally(()=>{
        setSaving(false);
        setLoaderText('');
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
        let changeData = getChangedData(schema, viewHelperProps.mode, sessData);
        if(viewHelperProps.mode !== 'edit') {
          /* If new then merge the changed data with origData */
          changeData = _.assign({}, schema.origData, changeData);
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
    sessDispatch({
      ...action,
      depChange: (...args)=>depListenerObj.current.getDepChange(...args),
      deferredDepChange: (...args)=>depListenerObj.current.getDeferredDepChange(...args),
    });
  };

  /* I am Groot */
  return (
    <DepListenerContext.Provider value={depListenerObj.current}>
      <Box className={classes.root}>
        <Box className={classes.form}>
          <Loader message={loaderText}/>
          <FormView value={sessData} viewHelperProps={viewHelperProps} formErr={formErr}
            schema={schema} accessPath={[]} dataDispatch={sessDispatchWithListener}
            hasSQLTab={props.hasSQL} getSQLValue={getSQLValue} firstEleRef={firstEleRef} />
          <FormFooterMessage type={MESSAGE_TYPE.ERROR} message={formErr.message}
            onClose={onErrClose} />
        </Box>
        <Box className={classes.footer}>
          {useMemo(()=><Box>
            <PgIconButton data-test="sql-help" onClick={()=>props.onHelp(true, isNew)} icon={<InfoIcon />}
              disabled={props.disableSqlHelp} className={classes.buttonMargin} title="SQL help for this object type."/>
            <PgIconButton data-test="dialog-help" onClick={()=>props.onHelp(false, isNew)} icon={<HelpIcon />} title="Help for this dialog."/>
          </Box>, [])}
          <Box marginLeft="auto">
            <DefaultButton data-test="Close" onClick={props.onClose} startIcon={<CloseIcon />} className={classes.buttonMargin}>
              {gettext('Close')}
            </DefaultButton>
            <DefaultButton data-test="Reset" onClick={onResetClick} startIcon={<SettingsBackupRestoreIcon />} disabled={!dirty || saving} className={classes.buttonMargin}>
              {gettext('Reset')}
            </DefaultButton>
            <PrimaryButton data-test="Save" onClick={onSaveClick} startIcon={<SaveIcon />} disabled={!dirty || saving || Boolean(formErr.name) || !formReady}>
              {gettext('Save')}
            </PrimaryButton>
          </Box>
        </Box>
      </Box>
    </DepListenerContext.Provider>
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
  schema: CustomPropTypes.schemaUI,
  onSave: PropTypes.func,
  onClose: PropTypes.func,
  onHelp: PropTypes.func,
  onDataChange: PropTypes.func,
  confirmOnCloseReset: PropTypes.bool,
  hasSQL: PropTypes.bool,
  getSQLValue: PropTypes.func,
  disableSqlHelp: PropTypes.bool,
};

const usePropsStyles = makeStyles((theme)=>({
  root: {
    height: '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column'
  },
  controlRow: {
    paddingBottom: theme.spacing(1),
  },
  form: {
    padding: theme.spacing(1),
    overflow: 'auto',
    flexGrow: 1,
  },
  toolbar: {
    padding: theme.spacing(0.5),
    background: theme.palette.background.default,
    ...theme.mixins.panelBorder.bottom,
  },
  buttonMargin: {
    marginRight: '0.5rem',
  },
}));

/* If its the properties tab */
function SchemaPropertiesView({
  getInitData, viewHelperProps, schema={}, ...props}) {
  const classes = usePropsStyles();
  let defaultTab = 'General';
  let tabs = {};
  const [origData, setOrigData] = useState({});
  const [loaderText, setLoaderText] = useState('');

  useEffect(()=>{
    setLoaderText('Loading...');
    getInitData().then((data)=>{
      data = data || {};
      setOrigData(data || {});
      setLoaderText('');
    });
  }, [getInitData]);

  /* A simple loop to get all the controls for the fields */
  schema.fields.forEach((f)=>{
    let {visible, disabled, group, readonly, ...field} = f;
    group = group || defaultTab;

    let verInLimit = (_.isUndefined(viewHelperProps.serverInfo) ? true :
      ((_.isUndefined(field.server_type) ? true :
        (viewHelperProps.serverInfo.type in field.server_type)) &&
        (_.isUndefined(field.min_version) ? true :
          (viewHelperProps.serverInfo.version >= field.min_version)) &&
        (_.isUndefined(field.max_version) ? true :
          (viewHelperProps.serverInfo.version <= field.max_version))));

    let _visible = true;
    if(field.mode) {
      _visible = (field.mode.indexOf(viewHelperProps.mode) > -1);
    }
    if(_visible && visible) {
      _visible = evalFunc(schema, visible, origData);
    }

    disabled = evalFunc(schema, disabled, origData);
    readonly = true;
    if(_visible && verInLimit) {
      if(!tabs[group]) tabs[group] = [];
      if(field && field.type === 'nested-fieldset') {
        tabs[group].push(
          <FieldSetView
            key={`nested${tabs[group].length}`}
            value={origData}
            viewHelperProps={viewHelperProps}
            schema={field.schema}
            accessPath={[]}
            formErr={{}}
            controlClassName={classes.controlRow}
            {...field} />
        );
      }else{
        tabs[group].push(
          <MappedFormControl
            key={field.id}
            viewHelperProps={viewHelperProps}
            state={origData}
            name={field.id}
            value={origData[field.id]}
            readonly={readonly}
            disabled={disabled}
            visible={_visible}
            {...field}
            className={classes.controlRow}
          />
        );
      }
    }
  });

  return (
    <Box className={classes.root}>
      <Loader message={loaderText}/>
      <Box className={classes.toolbar}>
        <PgIconButton
          data-test="help" onClick={()=>props.onHelp(true, false)} icon={<InfoIcon />} disabled={props.disableSqlHelp}
          title="SQL help for this object type." className={classes.buttonMargin} />
        <PgIconButton data-test="edit"
          onClick={props.onEdit} icon={<EditIcon />} title="Edit the object" />
      </Box>
      <Box className={classes.form}>
        <Box>
          {Object.keys(tabs).map((tabName)=>{
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
                <AccordionDetails>
                  <Box style={{width: '100%'}}>
                    {tabs[tabName]}
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
};

export default function SchemaView({formType, ...props}) {
  /* Switch the view based on formType */
  if(formType === 'tab') {
    return (
      <Theme>
        <SchemaPropertiesView {...props}/>
      </Theme>
    );
  }
  return (
    <Theme>
      <SchemaDialogView {...props}/>
    </Theme>
  );
}

SchemaView.propTypes = {
  formType: PropTypes.oneOf(['tab', 'dialog']),
};
