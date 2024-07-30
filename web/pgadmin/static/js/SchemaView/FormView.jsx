/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, {
  useContext, useEffect, useMemo, useRef, useState
} from 'react';
import { Box, Tab, Tabs, Grid } from '@mui/material';
import _ from 'lodash';
import PropTypes from 'prop-types';

import { FormNote, InputSQL } from 'sources/components/FormComponents';
import TabPanel from 'sources/components/TabPanel';
import { useOnScreen } from 'sources/custom_hooks';
import CustomPropTypes from 'sources/custom_prop_types';
import gettext from 'sources/gettext';
import { evalFunc } from 'sources/utils';

import DataGridView from './DataGridView';
import { MappedFormControl } from './MappedControl';
import FieldSetView from './FieldSetView';
import {
  SCHEMA_STATE_ACTIONS, SchemaStateContext, getFieldMetaData
} from './common';

import { FormContentBox } from './StyledComponents';


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
    readonly={true}
    className='FormView-sqlTabInput'
  />;
}

SQLTab.propTypes = {
  active: PropTypes.bool,
  getSQLValue: PropTypes.func.isRequired,
};


/* The first component of schema view form */
export default function FormView({
  value, schema={}, viewHelperProps, isNested=false, accessPath, dataDispatch, hasSQLTab,
  getSQLValue, onTabChange, firstEleRef, className, isDataGridForm=false, isTabView=true, visible}) {
  let defaultTab = gettext('General');
  let tabs = {};
  let tabsClassname = {};
  const [tabValue, setTabValue] = useState(0);

  const firstEleID = useRef();
  const formRef = useRef();
  const onScreenTracker = useRef(false);
  let groupLabels = {};
  const schemaRef = useRef(schema);
  const schemaState = useContext(SchemaStateContext);

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
          schemaState?.addDepListener(accessPath.concat(field.id), accessPath.concat(field.id), field.depChange, field.deferredDepChange);
        }
        (evalFunc(null, field.deps) || []).forEach((dep)=>{
          // when dep is a string then prepend the complete accessPath
          let source = accessPath.concat(dep);

          // but when dep is an array, then the intention is to provide the exact accesspath
          if(_.isArray(dep)) {
            source = dep;
          }
          if(field.depChange || field.deferredDepChange) {
            schemaState?.addDepListener(source, accessPath.concat(field.id), field.depChange, field.deferredDepChange);
          }
          if(field.depChange || field.deferredDepChange) {
            schemaState?.addDepListener(source, accessPath.concat(field.id), field.depChange, field.deferredDepChange);
          }
        });
      });
      return ()=>{
        /* Cleanup the listeners when unmounting */
        schemaState?.removeDepListener(accessPath);
      };
    }
  }, []);

  /* Upon reset, set the tab to first */
  useEffect(()=>{
    if (schemaState?.isReady)
      setTabValue(0);
  }, [schemaState?.isReady]);

  let fullTabs = [];
  let inlineComponents = [];
  let inlineCompGroup = null;

  /* Prepare the array of components based on the types */
  for(const field of schemaRef.current.fields) {
    let {
      visible, disabled, readonly, canAdd, canEdit, canDelete, canReorder,
      canAddRow, modeSupported
    } = getFieldMetaData(field, schema, value, viewHelperProps);

    if(!modeSupported) continue;

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

    // Lets choose the path based on type.
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
          controlClassName='FormView-controlRow'
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

      const ctrlProps = {
        key: field.id,  ...field,
        value: value[field.id] || [], viewHelperProps: viewHelperProps,
        schema: field.schema, accessPath: accessPath.concat(field.id), dataDispatch: dataDispatch,
        containerClassName: 'FormView-controlRow',
        canAdd: canAdd, canReorder: canReorder,
        canEdit: canEdit, canDelete: canDelete,
        visible: visible, canAddRow: canAddRow, onDelete: field.onDelete, canSearch: field.canSearch,
        expandEditOnAdd: field.expandEditOnAdd,
        fixedRows: (viewHelperProps.mode == 'create' ? field.fixedRows : undefined),
        addOnTop: Boolean(field.addOnTop)
      };

      if(CustomControl) {
        tabs[group].push(<CustomControl {...ctrlProps}/>);
      } else {
        tabs[group].push(<DataGridView {...ctrlProps} />);
      }
    } else {
      /* Its a form control */
      const hasError = _.isEqual(
        accessPath.concat(field.id), schemaState.errors?.name
      );
      /* When there is a change, the dependent values can change
       * lets pass the new changes to dependent and get the new values
       * from there as well.
       */
      if(field.isFullTab) {
        tabsClassname[group] ='FormView-fullSpace';
        fullTabs.push(group);
      }

      const id = field.id || `control${tabs[group].length}`;
      if(visible && !disabled && !firstEleID.current) {
        firstEleID.current = field.id;
      }

      let currentControl = <MappedFormControl
        inputRef={(ele)=>{
          if(firstEleRef && firstEleID.current === field.id) {
            if(typeof firstEleRef == 'function') {
              firstEleRef(ele);
            } else {
              firstEleRef.current = ele;
            }
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
        className='FormView-controlRow'
        noLabel={field.isFullTab}
        memoDeps={[
          value[id],
          readonly,
          disabled,
          visible,
          hasError,
          'FormView-controlRow',
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
          <Grid container spacing={0} key={`ic-${inlineComponents[0].key}`}
            className='FormView-controlRow' rowGap="8px">
            {inlineComponents}
          </Grid>
        );
        inlineComponents = [];
        inlineCompGroup = null;
      } else {
        tabs[group].push(currentControl);
      }
    }
  }

  if(inlineComponents?.length > 0) {
    tabs[inlineCompGroup].push(
      <Grid container spacing={0} key={`ic-${inlineComponents[0].key}`}
        className='FormView-controlRow' rowGap="8px">
        {inlineComponents}
      </Grid>
    );
  }

  let finalTabs = _.pickBy(
    tabs, (v, tabName) => schemaRef.current.filterGroups.indexOf(tabName) <= -1
  );

  // Add the SQL tab (if required)
  let sqlTabActive = false;
  let sqlTabName = gettext('SQL');

  if(hasSQLTab) {
    sqlTabActive = (Object.keys(finalTabs).length === tabValue);
    // Re-render and fetch the SQL tab when it is active.
    finalTabs[sqlTabName] = [
      <SQLTab key="sqltab" active={sqlTabActive} getSQLValue={getSQLValue} />,
    ];
    tabsClassname[sqlTabName] = 'FormView-fullSpace';
    fullTabs.push(sqlTabName);
  }

  useEffect(() => {
    onTabChange?.(tabValue, Object.keys(tabs)[tabValue], sqlTabActive);
  }, [tabValue]);

  const isSingleCollection = useMemo(()=>{
    // we can check if it is a single-collection.
    // in that case, we could force virtualization of the collection.
    if(isTabView) return false;

    const visibleEle = Object.values(finalTabs)[0].filter(
      (c) => c.props.visible
    );
    return visibleEle.length == 1 && visibleEle[0]?.type == DataGridView;
  }, [isTabView, finalTabs]);

  // Check whether form is kept hidden by visible prop.
  if(!_.isUndefined(visible) && !visible) {
    return <></>;
  }

  if(isTabView) {
    return (
      <FormContentBox height="100%" display="flex" flexDirection="column"
        className={className} ref={formRef} data-test="form-view">
        <Box>
          <Tabs
            value={tabValue}
            onChange={(event, selTabValue) => { setTabValue(selTabValue); }}
            variant="scrollable"
            scrollButtons="auto"
            action={(ref)=>ref?.updateIndicator()}
          >
            {Object.keys(finalTabs).map((tabName)=>{
              return <Tab key={tabName} label={tabName} data-test={tabName}/>;
            })}
          </Tabs>
        </Box>
        {Object.keys(finalTabs).map((tabName, i)=>{
          let contentClassName = [(
            schemaState.errors?.message ? 'FormView-errorMargin': null
          )];

          if(fullTabs.indexOf(tabName) == -1) {
            contentClassName.push('FormView-nestedControl');
          } else {
            contentClassName.push('FormView-fullControl');
          }

          return (
            <TabPanel key={tabName} value={tabValue} index={i}
              classNameRoot={[
                tabsClassname[tabName],
                (isNested ? 'FormView-nestedTabPanel' : null)
              ].join(' ')}
              className={contentClassName.join(' ')} data-testid={tabName}>
              {finalTabs[tabName]}
            </TabPanel>
          );
        })}
      </FormContentBox>
    );
  } else {
    let contentClassName = [
      isSingleCollection ? 'FormView-singleCollectionPanelContent' :
        'FormView-nonTabPanelContent',
      (schemaState.errors?.message ? 'FormView-errorMargin' : null)
    ];
    return (
      <FormContentBox height="100%" display="flex" flexDirection="column" className={className} ref={formRef} data-test="form-view">
        <TabPanel value={tabValue} index={0} classNameRoot={[isSingleCollection ? 'FormView-singleCollectionPanel' : 'FormView-nonTabPanel',className].join(' ')}
          className={contentClassName.join(' ')}>
          {Object.keys(finalTabs).map((tabName) => {
            return (
              <React.Fragment key={tabName}>
                {finalTabs[tabName]}
              </React.Fragment>
            );
          })}
        </TabPanel>
      </FormContentBox>
    );
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
