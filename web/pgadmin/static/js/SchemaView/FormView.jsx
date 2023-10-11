/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Box, makeStyles, Tab, Tabs } from '@material-ui/core';
import _ from 'lodash';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { MappedFormControl } from './MappedControl';
import TabPanel from '../components/TabPanel';
import DataGridView from './DataGridView';
import { SCHEMA_STATE_ACTIONS, StateUtilsContext } from '.';
import { FormNote, InputSQL } from '../components/FormComponents';
import gettext from 'sources/gettext';
import { evalFunc } from 'sources/utils';
import CustomPropTypes from '../custom_prop_types';
import { useOnScreen } from '../custom_hooks';
import { DepListenerContext } from './DepListener';
import FieldSetView from './FieldSetView';

const useStyles = makeStyles((theme)=>({
  fullSpace: {
    padding: 0,
    height: '100%',
    overflow: 'hidden',
  },
  controlRow: {
    marginBottom: theme.spacing(1),
  },
  nestedTabPanel: {
    backgroundColor: theme.otherVars.headerBg,
  },
  nestedControl: {
    height: 'unset',
  },
  fullControl: {
    display: 'flex',
    flexDirection: 'column'
  },
  errorMargin: {
    /* Error footer space */
    paddingBottom: '36px !important',
  },
  sqlTabInput: {
    border: 0,
  }
}));

/* Optional SQL tab */
function SQLTab({active, getSQLValue}) {
  const classes = useStyles();
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
    readonly={true}
    className={classes.sqlTabInput}
  />;
}

SQLTab.propTypes = {
  active: PropTypes.bool,
  getSQLValue: PropTypes.func.isRequired,
};

export function getFieldMetaData(field, schema, value, viewHelperProps, onlyModeCheck=false) {
  let retData = {
    readonly: false,
    disabled: false,
    visible: true,
    editable: true,
    canAdd: true,
    canEdit: false,
    canDelete: true,
    modeSupported: true,
    canAddRow: true,
  };

  if(field.mode) {
    retData.modeSupported = (field.mode.indexOf(viewHelperProps.mode) > -1);
  }
  if(!retData.modeSupported) {
    return retData;
  }

  if(onlyModeCheck) {
    return retData;
  }

  let {visible, disabled, readonly, editable} = field;
  let verInLimit;

  if (_.isUndefined(viewHelperProps.serverInfo)) {
    verInLimit= true;
  } else {
    verInLimit = ((_.isUndefined(field.server_type) ? true :
      (viewHelperProps.serverInfo.type in field.server_type)) &&
      (_.isUndefined(field.min_version) ? true :
        (viewHelperProps.serverInfo.version >= field.min_version)) &&
      (_.isUndefined(field.max_version) ? true :
        (viewHelperProps.serverInfo.version <= field.max_version)));
  }

  retData.readonly = viewHelperProps.inCatalog || (viewHelperProps.mode == 'properties');
  if(!retData.readonly) {
    retData.readonly = evalFunc(schema, readonly, value);
  }

  let _visible = verInLimit;
  _visible = _visible && evalFunc(schema, _.isUndefined(visible) ? true : visible, value);
  retData.visible = Boolean(_visible);

  retData.disabled = Boolean(evalFunc(schema, disabled, value));

  retData.editable = !(viewHelperProps.inCatalog || (viewHelperProps.mode == 'properties'));
  if(retData.editable) {
    retData.editable = evalFunc(schema, _.isUndefined(editable) ? true : editable, value);
  }

  let {canAdd, canEdit, canDelete, canReorder, canAddRow } = field;
  retData.canAdd = _.isUndefined(canAdd) ? retData.canAdd : evalFunc(schema, canAdd, value);
  retData.canAdd = !retData.disabled && retData.canAdd;
  retData.canEdit = _.isUndefined(canEdit) ? retData.canEdit : evalFunc(schema, canEdit, value);
  retData.canEdit = !retData.disabled && retData.canEdit;
  retData.canDelete = _.isUndefined(canDelete) ? retData.canDelete : evalFunc(schema, canDelete, value);
  retData.canDelete = !retData.disabled && retData.canDelete;
  retData.canReorder =_.isUndefined(canReorder) ? retData.canReorder : evalFunc(schema, canReorder, value);
  retData.canAddRow = _.isUndefined(canAddRow) ? retData.canAddRow : evalFunc(schema, canAddRow, value);
  return retData;
}

/* The first component of schema view form */
export default function FormView({
  value, schema={}, viewHelperProps, isNested=false, accessPath, dataDispatch, hasSQLTab,
  getSQLValue, onTabChange, firstEleRef, className, isDataGridForm=false, isTabView=true, visible}) {
  let defaultTab = 'General';
  let tabs = {};
  let tabsClassname = {};
  const [tabValue, setTabValue] = useState(0);
  const classes = useStyles();
  const firstEleID = useRef();
  const formRef = useRef();
  const onScreenTracker = useRef(false);
  const depListener = useContext(DepListenerContext);
  let groupLabels = {};
  const schemaRef = useRef(schema);
  const stateUtils = useContext(StateUtilsContext);

  let isOnScreen = useOnScreen(formRef);

  useEffect(()=>{
    if(isOnScreen) {
      /* Don't do it when the form is alredy visible */
      if(!onScreenTracker.current) {
        /* Re-select the tab. If form is hidden then sometimes it is not selected */
        setTabValue((prev)=>prev);
        onScreenTracker.current = true;
      }
    } else {
      onScreenTracker.current = false;
    }
  }, [isOnScreen]);

  useEffect(()=>{
    /* Calculate the fields which depends on the current field */
    if(!isDataGridForm) {
      schemaRef.current.fields.forEach((field)=>{
        /* Self change is also dep change */
        if(field.depChange || field.deferredDepChange) {
          depListener.addDepListener(accessPath.concat(field.id), accessPath.concat(field.id), field.depChange, field.deferredDepChange);
        }
        (evalFunc(null, field.deps) || []).forEach((dep)=>{
          // when dep is a string then prepend the complete accessPath
          let source = accessPath.concat(dep);

          // but when dep is an array, then the intention is to provide the exact accesspath
          if(_.isArray(dep)) {
            source = dep;
          }
          if(field.depChange || field.deferredDepChange) {
            depListener.addDepListener(source, accessPath.concat(field.id), field.depChange, field.deferredDepChange);
          }
          if(field.depChange || field.deferredDepChange) {
            depListener.addDepListener(source, accessPath.concat(field.id), field.depChange, field.deferredDepChange);
          }
        });
      });
      return ()=>{
        /* Cleanup the listeners when unmounting */
        depListener.removeDepListener(accessPath);
      };
    }
  }, []);

  /* Upon reset, set the tab to first */
  useEffect(()=>{
    setTabValue(0);
  }, [stateUtils.formResetKey]);

  let fullTabs = [];
  let inlineComponents = [];
  let inlineCompGroup = null;

  /* Prepare the array of components based on the types */
  for(const field of schemaRef.current.fields) {
    let {visible, disabled, readonly, canAdd, canEdit, canDelete, canReorder, canAddRow, modeSupported} =
      getFieldMetaData(field, schema, value, viewHelperProps);

    if(modeSupported) {
      let {group, CustomControl} = field;
      if(field.type === 'group') {
        groupLabels[field.id] = field.label;
        if(!visible) {
          schemaRef.current.filterGroups.push(field.label);
        }
        continue;
      }
      group = groupLabels[group] || group || defaultTab;

      if(!tabs[group]) tabs[group] = [];

      /* Lets choose the path based on type */
      if(field.type === 'nested-tab') {
        /* Pass on the top schema */
        if(isNested) {
          field.schema.top = schemaRef.current.top;
        } else {
          field.schema.top = schema;
        }
        tabs[group].push(
          <FormView key={`nested${tabs[group].length}`} value={value} viewHelperProps={viewHelperProps}
            schema={field.schema} accessPath={accessPath} dataDispatch={dataDispatch} isNested={true} isDataGridForm={isDataGridForm}
            {...field} visible={visible}/>
        );
      } else if(field.type === 'nested-fieldset') {
        /* Pass on the top schema */
        if(isNested) {
          field.schema.top = schemaRef.current.top;
        } else {
          field.schema.top = schema;
        }
        tabs[group].push(
          <FieldSetView key={`nested${tabs[group].length}`} value={value} viewHelperProps={viewHelperProps}
            schema={field.schema} accessPath={accessPath} dataDispatch={dataDispatch} isNested={true} isDataGridForm={isDataGridForm}
            controlClassName={classes.controlRow}
            {...field} visible={visible}/>
        );
      } else if(field.type === 'collection') {
        /* If its a collection, let data grid view handle it */
        /* Pass on the top schema */
        if(isNested) {
          field.schema.top = schemaRef.current.top;
        } else {
          field.schema.top = schemaRef.current;
        }

        if(!_.isUndefined(field.fixedRows)) {
          canAdd = false;
          canDelete = false;
        }

        const props = {
          key: field.id, value: value[field.id] || [], viewHelperProps: viewHelperProps,
          schema: field.schema, accessPath: accessPath.concat(field.id), dataDispatch: dataDispatch,
          containerClassName: classes.controlRow, ...field, canAdd: canAdd, canReorder: canReorder,
          canEdit: canEdit, canDelete: canDelete,
          visible: visible, canAddRow: canAddRow, onDelete: field.onDelete, canSearch: field.canSearch,
          expandEditOnAdd: field.expandEditOnAdd,
          fixedRows: (viewHelperProps.mode == 'create' ? field.fixedRows : undefined),
          addOnTop: Boolean(field.addOnTop)
        };

        if(CustomControl) {
          tabs[group].push(<CustomControl {...props}/>);
        } else {
          tabs[group].push(<DataGridView {...props}/>);
        }
      } else {
        /* Its a form control */
        const hasError = _.isEqual(accessPath.concat(field.id), stateUtils.formErr.name);
        /* When there is a change, the dependent values can change
         * lets pass the new changes to dependent and get the new values
         * from there as well.
         */
        if(field.isFullTab) {
          tabsClassname[group] = classes.fullSpace;
          fullTabs.push(group);
        }

        const id = field.id || `control${tabs[group].length}`;
        if(visible && !disabled && !firstEleID.current) {
          firstEleID.current = field.id;
        }

        let currentControl = <MappedFormControl
          inputRef={(ele)=>{
            if(firstEleRef && firstEleID.current === field.id) {
              firstEleRef.current = ele;
            }
          }}
          state={value}
          key={id}
          viewHelperProps={viewHelperProps}
          name={id}
          value={value[id]}
          {...field}
          id={id}
          readonly={readonly}
          disabled={disabled}
          visible={visible}
          onChange={(changeValue)=>{
            /* Get the changes on dependent fields as well */
            dataDispatch({
              type: SCHEMA_STATE_ACTIONS.SET_VALUE,
              path: accessPath.concat(id),
              value: changeValue,
            });
          }}
          hasError={hasError}
          className={classes.controlRow}
          noLabel={field.isFullTab}
          memoDeps={[
            value[id],
            readonly,
            disabled,
            visible,
            hasError,
            classes.controlRow,
            ...(evalFunc(null, field.deps) || []).map((dep)=>value[dep]),
          ]}
        />;

        if(field.isFullTab && field.helpMessage) {
          currentControl = (<React.Fragment key={`coll-${field.id}`}>
            <FormNote key={`note-${field.id}`} text={field.helpMessage}/>
            {currentControl}
          </React.Fragment>);
        }

        if(field.inlineNext) {
          inlineComponents.push(React.cloneElement(currentControl, {
            withContainer: false, controlGridBasis: 3
          }));
          inlineCompGroup = group;
        } else if(inlineComponents?.length > 0) {
          inlineComponents.push(React.cloneElement(currentControl, {
            withContainer: false, controlGridBasis: 3
          }));
          tabs[group].push(
            <Box key={`ic-${inlineComponents[0].key}`} display="flex" className={classes.controlRow} gridRowGap="8px" flexWrap="wrap">
              {inlineComponents}
            </Box>
          );
          inlineComponents = [];
          inlineCompGroup = null;
        } else {
          tabs[group].push(currentControl);
        }
      }
    }
  }

  if(inlineComponents?.length > 0) {
    tabs[inlineCompGroup].push(
      <Box key={`ic-${inlineComponents[0].key}`} display="flex" className={classes.controlRow} gridRowGap="8px" flexWrap="wrap">
        {inlineComponents}
      </Box>
    );
  }

  let finalTabs = _.pickBy(tabs, (v, tabName)=>schemaRef.current.filterGroups.indexOf(tabName) <= -1);

  /* Add the SQL tab if required */
  let sqlTabActive = false;
  let sqlTabName = gettext('SQL');
  if(hasSQLTab) {
    sqlTabActive = (Object.keys(finalTabs).length === tabValue);
    /* Re-render and fetch the SQL tab when it is active */
    finalTabs[sqlTabName] = [
      <SQLTab key="sqltab" active={sqlTabActive} getSQLValue={getSQLValue} />,
    ];
    tabsClassname[sqlTabName] = classes.fullSpace;
    fullTabs.push(sqlTabName);
  }

  useEffect(()=>{
    onTabChange && onTabChange(tabValue, Object.keys(tabs)[tabValue], sqlTabActive);
  }, [tabValue]);

  /* check whether form is kept hidden by visible prop */
  if(!_.isUndefined(visible) && !visible) {
    return <></>;
  }

  if(isTabView) {
    return (
      <>
        <Box height="100%" display="flex" flexDirection="column" className={className} ref={formRef}>
          <Box>
            <Tabs
              value={tabValue}
              onChange={(event, selTabValue) => {
                setTabValue(selTabValue);
              }}
              variant="scrollable"
              scrollButtons="auto"
              action={(ref)=>ref && ref.updateIndicator()}
            >
              {Object.keys(finalTabs).map((tabName)=>{
                return <Tab key={tabName} label={tabName} />;
              })}
            </Tabs>
          </Box>
          {Object.keys(finalTabs).map((tabName, i)=>{
            let contentClassName = [stateUtils.formErr.message ? classes.errorMargin : null];
            if(fullTabs.indexOf(tabName) == -1) {
              contentClassName.push(classes.nestedControl);
            } else {
              contentClassName.push(classes.fullControl);
            }
            return (
              <TabPanel key={tabName} value={tabValue} index={i} classNameRoot={clsx(tabsClassname[tabName], isNested ? classes.nestedTabPanel : null)}
                className={clsx(contentClassName)}>
                {finalTabs[tabName]}
              </TabPanel>
            );
          })}
        </Box>
      </>);
  } else {
    let contentClassName = [stateUtils.formErr.message ? classes.errorMargin : null];
    return (
      <>
        <Box height="100%" display="flex" flexDirection="column" className={clsx(className, contentClassName)} ref={formRef}>
          {Object.keys(finalTabs).map((tabName)=>{
            return (
              <React.Fragment key={tabName}>{finalTabs[tabName]}</React.Fragment>
            );
          })}
        </Box>
      </>);
  }
}

FormView.propTypes = {
  value: PropTypes.any,
  schema: CustomPropTypes.schemaUI.isRequired,
  viewHelperProps: PropTypes.object,
  isNested: PropTypes.bool,
  isDataGridForm: PropTypes.bool,
  isTabView: PropTypes.bool,
  visible: PropTypes.oneOfType([
    PropTypes.bool, PropTypes.func,
  ]),
  accessPath: PropTypes.array.isRequired,
  dataDispatch: PropTypes.func,
  hasSQLTab: PropTypes.bool,
  getSQLValue: PropTypes.func,
  onTabChange: PropTypes.func,
  firstEleRef: CustomPropTypes.ref,
  className: CustomPropTypes.className,
};
