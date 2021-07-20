/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Box, makeStyles, Tab, Tabs } from '@material-ui/core';
import _ from 'lodash';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { MappedFormControl } from './MappedControl';
import TabPanel from '../components/TabPanel';
import DataGridView from './DataGridView';
import { SCHEMA_STATE_ACTIONS } from '.';
import { InputSQL } from '../components/FormComponents';
import gettext from 'sources/gettext';
import { evalFunc } from 'sources/utils';
import CustomPropTypes from '../custom_prop_types';
import { useOnScreen } from '../custom_hooks';
import { DepListenerContext } from './DepListener';
import FieldSetView from './FieldSetView';

const useStyles = makeStyles((theme)=>({
  fullSpace: {
    padding: 0,
    height: '100%'
  },
  controlRow: {
    paddingBottom: theme.spacing(1),
  },
  nestedTabPanel: {
    backgroundColor: theme.otherVars.headerBg,
  },
  nestedControl: {
    height: 'unset',
  }
}));

/* Optional SQL tab */
function SQLTab({active, getSQLValue}) {
  const [sql, setSql] = useState('Loading...');
  useEffect(()=>{
    let unmounted = false;
    if(active) {
      setSql('Loading...');
      getSQLValue().then((value)=>{
        if(!unmounted) {
          setSql(value);
        }
      });
    }
    return ()=>{unmounted=true;};
  }, [active]);

  return <InputSQL
    value={sql}
    options={{
      readOnly: true,
    }}
    isAsync={true}
  />;
}

SQLTab.propTypes = {
  active: PropTypes.bool,
  getSQLValue: PropTypes.func.isRequired,
};

export function getFieldMetaData(field, schema, value, viewHelperProps) {
  let retData = {
    readonly: false,
    disabled: false,
    visible: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
    modeSupported: true,
  };

  if(field.mode) {
    retData.modeSupported = (field.mode.indexOf(viewHelperProps.mode) > -1);
  }
  if(!retData.modeSupported) {
    return retData;
  }

  let {visible, disabled, readonly} = field;

  let verInLimit = (_.isUndefined(viewHelperProps.serverInfo) ? true :
    ((_.isUndefined(field.server_type) ? true :
      (viewHelperProps.serverInfo.type in field.server_type)) &&
      (_.isUndefined(field.min_version) ? true :
        (viewHelperProps.serverInfo.version >= field.min_version)) &&
      (_.isUndefined(field.max_version) ? true :
        (viewHelperProps.serverInfo.version <= field.max_version))));

  let _readonly = viewHelperProps.inCatalog || (viewHelperProps.mode == 'properties');
  if(!_readonly) {
    _readonly = evalFunc(schema, readonly, value);
  }
  retData.readonly = _readonly;

  let _visible = verInLimit;
  _visible = _visible && evalFunc(schema, _.isUndefined(visible) ? true : visible, value);
  retData.visible = Boolean(_visible);

  retData.disabled = Boolean(evalFunc(schema, disabled, value));

  let {canAdd, canEdit, canDelete } = field;
  retData.canAdd = _.isUndefined(canAdd) ? true : evalFunc(schema, canAdd, value);
  retData.canEdit = _.isUndefined(canEdit) ? true : evalFunc(schema, canEdit, value);
  retData.canDelete = _.isUndefined(canDelete) ? true : evalFunc(schema, canDelete, value);

  return retData;
}

/* The first component of schema view form */
export default function FormView({
  value, formErr, schema={}, viewHelperProps, isNested=false, accessPath, dataDispatch, hasSQLTab,
  getSQLValue, onTabChange, firstEleRef, className, isDataGridForm=false}) {
  let defaultTab = 'General';
  let tabs = {};
  let tabsClassname = {};
  const [tabValue, setTabValue] = useState(0);
  const classes = useStyles();
  const firstElement = useRef();
  const formRef = useRef();
  const onScreenTracker = useRef(false);
  const depListener = useContext(DepListenerContext);
  let groupLabels = {};

  let isOnScreen = useOnScreen(formRef);
  if(isOnScreen) {
    /* Don't do it when the form is alredy visible */
    if(onScreenTracker.current == false) {
      /* Re-select the tab. If form is hidden then sometimes it is not selected */
      setTabValue(tabValue);
      onScreenTracker.current = true;
    }
  } else {
    onScreenTracker.current = false;
  }

  useEffect(()=>{
    /* Calculate the fields which depends on the current field */
    if(!isDataGridForm) {
      schema.fields.forEach((field)=>{
        /* Self change is also dep change */
        if(field.depChange || field.deferredDepChange) {
          depListener.addDepListener(accessPath.concat(field.id), accessPath.concat(field.id), field.depChange, field.deferredDepChange);
        }
        (evalFunc(null, field.deps) || []).forEach((dep)=>{
          let source = accessPath.concat(dep);
          if(_.isArray(dep)) {
            source = dep;
          }
          if(field.depChange) {
            depListener.addDepListener(source, accessPath.concat(field.id), field.depChange);
          }
        });
      });
    }
  }, []);

  /* Prepare the array of components based on the types */
  schema.fields.forEach((field)=>{
    let {visible, disabled, readonly, canAdd, canEdit, canDelete, modeSupported} =
      getFieldMetaData(field, schema, value, viewHelperProps);

    if(modeSupported) {
      let {group} = field;
      group = groupLabels[group] || group || defaultTab;

      if(!tabs[group]) tabs[group] = [];

      /* Lets choose the path based on type */
      if(field.type === 'nested-tab') {
        /* Pass on the top schema */
        if(isNested) {
          field.schema.top = schema.top;
        } else {
          field.schema.top = schema;
        }
        tabs[group].push(
          <FormView key={`nested${tabs[group].length}`} value={value} viewHelperProps={viewHelperProps} formErr={formErr}
            schema={field.schema} accessPath={accessPath} dataDispatch={dataDispatch} isNested={true} isDataGridForm={isDataGridForm} {...field}/>
        );
      } else if(field.type === 'nested-fieldset') {
        /* Pass on the top schema */
        if(isNested) {
          field.schema.top = schema.top;
        } else {
          field.schema.top = schema;
        }
        tabs[group].push(
          <FieldSetView key={`nested${tabs[group].length}`} value={value} viewHelperProps={viewHelperProps} formErr={formErr}
            schema={field.schema} accessPath={accessPath} dataDispatch={dataDispatch} isNested={true} isDataGridForm={isDataGridForm}
            controlClassName={classes.controlRow}
            {...field} />
        );
      } else if(field.type === 'collection') {
        /* If its a collection, let data grid view handle it */
        let depsMap = [value[field.id]];
        /* Pass on the top schema */
        if(isNested) {
          field.schema.top = schema.top;
        } else {
          field.schema.top = schema;
        }

        depsMap.push(canAdd, canEdit, canDelete, visible);

        tabs[group].push(
          useMemo(()=><DataGridView key={field.id} value={value[field.id]} viewHelperProps={viewHelperProps} formErr={formErr}
            schema={field.schema} accessPath={accessPath.concat(field.id)} dataDispatch={dataDispatch} containerClassName={classes.controlRow}
            {...field} canAdd={canAdd} canEdit={canEdit} canDelete={canDelete} visible={visible}/>, depsMap)
        );
      } else if(field.type === 'group') {
        groupLabels[field.id] = field.label;
        if(!visible) {
          schema.filterGroups.push(field.label);
        }
      } else {
        /* Its a form control */
        const hasError = field.id == formErr.name;
        /* When there is a change, the dependent values can change
         * lets pass the new changes to dependent and get the new values
         * from there as well.
         */
        tabs[group].push(
          useMemo(()=><MappedFormControl
            inputRef={(ele)=>{
              if(firstEleRef && !firstEleRef.current) {
                firstEleRef.current = ele;
              }
            }}
            state={value}
            key={field.id}
            viewHelperProps={viewHelperProps}
            name={field.id}
            value={value[field.id]}
            {...field}
            readonly={readonly}
            disabled={disabled}
            visible={visible}
            onChange={(value)=>{
              /* Get the changes on dependent fields as well */
              dataDispatch({
                type: SCHEMA_STATE_ACTIONS.SET_VALUE,
                path: accessPath.concat(field.id),
                value: value,
              });
            }}
            hasError={hasError}
            className={classes.controlRow}
          />, [
            value[field.id],
            readonly,
            disabled,
            visible,
            hasError,
            classes.controlRow,
            ...(evalFunc(null, field.deps) || []).map((dep)=>value[dep]),
          ])
        );
      }
    }
  });

  /* Add the SQL tab if required */
  let sqlTabActive = false;
  let sqlTabName = gettext('SQL');
  if(hasSQLTab) {
    sqlTabActive = (Object.keys(tabs).length === tabValue);
    /* Re-render and fetch the SQL tab when it is active */
    tabs[sqlTabName] = [
      useMemo(()=><SQLTab key="sqltab" active={sqlTabActive} getSQLValue={getSQLValue} />, [sqlTabActive]),
    ];
    tabsClassname[sqlTabName] = classes.fullSpace;
  }

  useEffect(()=>{
    firstElement.current && firstElement.current.focus();
  }, []);

  useEffect(()=>{
    onTabChange && onTabChange(tabValue, Object.keys(tabs)[tabValue], sqlTabActive);
  }, [tabValue]);

  return (
    <>
      <Box height="100%" display="flex" flexDirection="column" className={className} ref={formRef}>
        <Box>
          <Tabs
            value={tabValue}
            onChange={(event, selTabValue) => {
              setTabValue(selTabValue);
            }}
            // indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            action={(ref)=>ref && ref.updateIndicator()}
          >
            {Object.keys(tabs).map((tabName)=>{
              return <Tab key={tabName} label={tabName} />;
            })}
          </Tabs>
        </Box>
        {Object.keys(tabs).map((tabName, i)=>{
          return (
            <TabPanel key={tabName} value={tabValue} index={i} classNameRoot={clsx(tabsClassname[tabName], isNested ? classes.nestedTabPanel : null)}
              className={tabName != sqlTabName ? classes.nestedControl : null}>
              {tabs[tabName]}
            </TabPanel>
          );
        })}
      </Box>
    </>);
}

FormView.propTypes = {
  value: PropTypes.any,
  formErr: PropTypes.object,
  schema: CustomPropTypes.schemaUI.isRequired,
  viewHelperProps: PropTypes.object,
  isNested: PropTypes.bool,
  isDataGridForm: PropTypes.bool,
  accessPath: PropTypes.array.isRequired,
  dataDispatch: PropTypes.func,
  hasSQLTab: PropTypes.bool,
  getSQLValue: PropTypes.func,
  onTabChange: PropTypes.func,
  firstEleRef: CustomPropTypes.ref,
  className: CustomPropTypes.className,
};
