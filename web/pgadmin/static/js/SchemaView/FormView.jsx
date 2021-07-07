/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useMemo, useRef, useState } from 'react';
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

/* The first component of schema view form */
export default function FormView({
  value, formErr, schema={}, viewHelperProps, isNested=false, accessPath, dataDispatch, hasSQLTab, getSQLValue, onTabChange, firstEleRef, className}) {
  let defaultTab = 'General';
  let tabs = {};
  let tabsClassname = {};
  const [tabValue, setTabValue] = useState(0);
  const classes = useStyles();
  const firstElement = useRef();
  let groupLabels = {};

  schema = schema || {fields: []};

  /* Calculate the fields which depends on the current field
  deps has info on fields which the current field depends on. */
  const dependsOnField = useMemo(()=>{
    let res = {};
    schema.fields.forEach((field)=>{
      (field.deps || []).forEach((dep)=>{
        res[dep] = res[dep] || [];
        res[dep].push(field.id);
      });
    });
    return res;
  }, []);

  /* Prepare the array of components based on the types */
  schema.fields.forEach((f)=>{
    let modeSuppoted = true;
    if(f.mode) {
      modeSuppoted = (f.mode.indexOf(viewHelperProps.mode) > -1);
    }
    if(modeSuppoted) {
      let {visible, disabled, group, readonly, ...field} = f;
      group = groupLabels[group] || group || defaultTab;

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

      visible = _.isUndefined(visible) ? true : visible;
      let _visible = true;
      if(visible) {
        _visible = evalFunc(schema, visible, value);
      }
      _visible = _visible && verInLimit;

      disabled = evalFunc(schema, disabled, value);


      if(!tabs[group]) tabs[group] = [];

      /* Lets choose the path based on type */
      if(field.type === 'nested-tab') {
        /* Pass on the top schema */
        field.schema.top = schema.top;
        tabs[group].push(
          <FormView key={`nested${tabs[group].length}`} value={value} viewHelperProps={viewHelperProps} formErr={formErr}
            schema={field.schema} accessPath={accessPath} dataDispatch={dataDispatch} isNested={true} />
        );
      } else if(field.type === 'collection') {
        /* Pass on the top schema */
        field.schema.top = schema.top;
        /* If its a collection, let data grid view handle it */
        tabs[group].push(
          useMemo(()=><DataGridView key={field.id} value={value[field.id]} viewHelperProps={viewHelperProps} formErr={formErr}
            schema={field.schema} accessPath={accessPath.concat(field.id)} dataDispatch={dataDispatch} containerClassName={classes.controlRow}
            {...field}/>, [value[field.id]])
        );
      } else if(field.type === 'group') {
        groupLabels[field.id] = field.label;
        if(!_visible) {
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
            readonly={_readonly}
            disabled={disabled}
            visible={_visible}
            {...field}
            onChange={(value)=>{
              /* Get the changes on dependent fields as well */
              const depChange = (state)=>{
                field.depChange && _.merge(state, field.depChange(state) || {});
                (dependsOnField[field.id] || []).forEach((d)=>{
                  d = _.find(schema.fields, (f)=>f.id==d);
                  if(d.depChange) {
                    _.merge(state, d.depChange(state) || {});
                  }
                });
                return state;
              };
              dataDispatch({
                type: SCHEMA_STATE_ACTIONS.SET_VALUE,
                path: accessPath.concat(field.id),
                value: value,
                depChange: depChange,
              });
            }}
            hasError={hasError}
            className={classes.controlRow}
          />, [
            value[field.id],
            _readonly,
            disabled,
            _visible,
            hasError,
            classes.controlRow,
            ...(field.deps || []).map((dep)=>value[dep])
          ])
        );
      }
    }
  });

  /* Add the SQL tab if required */
  let sqlTabActive = false;
  if(hasSQLTab) {
    let sqlTabName = gettext('SQL');
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
      <Box height="100%" display="flex" flexDirection="column" className={className}>
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
            <TabPanel key={tabName} value={tabValue} index={i} classNameRoot={clsx(tabsClassname[tabName], isNested ? classes.nestedTabPanel : null)}>
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
  accessPath: PropTypes.array.isRequired,
  dataDispatch: PropTypes.func,
  hasSQLTab: PropTypes.bool,
  getSQLValue: PropTypes.func,
  onTabChange: PropTypes.func,
  firstEleRef: CustomPropTypes.ref,
  className: CustomPropTypes.className,
};
