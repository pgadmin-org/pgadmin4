/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, {
  useCallback, useContext, useEffect, useMemo, useRef, useState
} from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import _ from 'lodash';
import PropTypes from 'prop-types';


import {
  FormFooterMessage, MESSAGE_TYPE, FormNote
} from 'sources/components/FormComponents';
import TabPanel from 'sources/components/TabPanel';
import { useOnScreen } from 'sources/custom_hooks';
import CustomPropTypes from 'sources/custom_prop_types';
import gettext from 'sources/gettext';

import { FieldControl } from './FieldControl';
import { SQLTab } from './SQLTab';
import { FormContentBox } from './StyledComponents';
import { SchemaStateContext } from './SchemaState';
import {
  useFieldSchema, useFieldValue, useSchemaStateSubscriber,
} from './hooks';
import { registerView, View } from './registry';
import { createFieldControls, listenDepChanges } from './utils';

const ErrorMessageBox = () => {
  const [key, setKey] = useState(0);
  const schemaState = useContext(SchemaStateContext);
  const onErrClose = useCallback(() => {
    const err = { ...schemaState.errors, message: '' };
    // Unset the error message, but not the name.
    schemaState.setError(err);
  }, [schemaState]);
  const errors = schemaState.errors;
  const message = errors?.message || '';

  useEffect(() => {
    // Refresh on message changes.
    return schemaState.subscribe(
      ['errors', 'message'], () => setKey(Date.now()), 'states'
    );
  }, [key]);

  return <FormFooterMessage
    type={MESSAGE_TYPE.ERROR} message={message} onClose={onErrClose}
  />;
};


// The first component of schema view form.
export default function FormView({
  accessPath, schema=null, isNested=false, dataDispatch, className,
  hasSQLTab, getSQLValue, isTabView=true, viewHelperProps, field,
  showError=false, resetKey, focusOnFirstInput=false
}) {
  const [key, setKey] = useState(0);
  const subscriberManager = useSchemaStateSubscriber(setKey);
  const schemaState = useContext(SchemaStateContext);
  const value = useFieldValue(accessPath, schemaState);
  const { visible } = useFieldSchema(
    field, accessPath, value, viewHelperProps, schemaState, subscriberManager
  );

  const [tabValue, setTabValue] = useState(0);
  const formRef = useRef();
  const onScreenTracker = useRef(false);
  let isOnScreen = useOnScreen(formRef);

  if (!schema) schema = field.schema;

  // Set focus on the first focusable element.
  useEffect(() => {
    if (!focusOnFirstInput) return;
    setTimeout(() => {
      const formEle = formRef.current;
      if (!formEle) return;
      const activeTabElement = formEle.querySelector(
        '[data-test="tabpanel"]:not([hidden])'
      );
      if (!activeTabElement) return;

      // Find the first focusable input, which is either:
      // * An editable Input element.
      // * A select element, which is not disabled.
      // * An href element.
      // * Any element with 'tabindex', but - tabindex is not set to '-1'.
      const firstFocussableElement = activeTabElement.querySelector([
        'button:not([role="tab"])',
        '[href]',
        'input:not(disabled)',
        'select:not(disabled)',
        'textarea',
        '[tabindex]:not([tabindex="-1"]):not([data-test="tabpanel"])',
        'div[class="cm-content"]:not([aria-readonly="true"])',
      ].join(', '));

      if (firstFocussableElement) firstFocussableElement.focus();
    }, 200);
  }, [tabValue]);

  useEffect(() => {
    // Refresh on message changes.
    return subscriberManager.current?.add(
      schemaState, ['errors', 'message'], 'states',
      (newState, prevState) => {
        if (_.isUndefined(newState) || _.isUndefined(prevState))
          subscriberManager.current?.signal();
      }
    );
  }, [key]);

  useEffect(() => {
    if (!visible) return;

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

  listenDepChanges(
    accessPath, field, schemaState, () => subscriberManager.current?.signal()
  );

  // Upon reset, set the tab to first.
  useEffect(() => {
    if (!visible || !resetKey) return;
    if (resetKey) {
      setTabValue(0);
    }
  }, [resetKey]);

  const finalGroups = useMemo(
    () => createFieldControls({
      schema, schemaState, accessPath, viewHelperProps, dataDispatch
    }),
    [schema, schemaState, accessPath, viewHelperProps, dataDispatch]
  );

  // Check whether form is kept hidden by visible prop.
  if(!finalGroups || (!_.isUndefined(visible) && !visible)) {
    return <></>;
  }

  const isSingleCollection = () => {
    const DataGridView = View('DataGridView');
    return (
      finalGroups.length == 1 &&
      finalGroups[0].controls.length == 1 &&
      finalGroups[0].controls[0].control == DataGridView
    );
  };

  if(isTabView) {
    return (
      <>
        <FormContentBox height="100%" display="flex" flexDirection="column"
          className={className} ref={formRef} data-test="form-view">
          <Box>
            <Tabs
              value={tabValue}
              onChange={(ev, nextTabIndex) => { setTabValue(nextTabIndex); }}
              variant="scrollable"
              scrollButtons="auto"
              action={(ref) => ref?.updateIndicator()}
            >{
                finalGroups.map((tabGroup, idx) =>
                  <Tab
                    key={tabGroup.id}
                    label={tabGroup.label}
                    data-test={tabGroup.id}
                    className={
                      tabGroup.hasError &&
                      tabValue != idx ? 'tab-with-error' : ''
                    }
                  />
                )
              }{hasSQLTab &&
                <Tab
                  key={'sql-tab'}
                  label={gettext('SQL')}
                  data-test={'SQL'}
                />
              }</Tabs>
          </Box>
          {
            finalGroups.map((group, idx) => {
              let contentClassName = [
                group.isFullTab ?
                  'FormView-fullControl' : 'FormView-nestedControl',
                schemaState.errors?.message ? 'FormView-errorMargin' : null
              ];

              let id = group.id.replace(' ', '');

              return (
                <TabPanel
                  key={id}
                  value={tabValue}
                  index={idx}
                  classNameRoot={[
                    group.className,
                    (isNested ? 'FormView-nestedTabPanel' : null)
                  ].join(' ')}
                  className={contentClassName.join(' ')}
                  data-testid={group.id}>
                  {
                    group.isFullTab && group.field?.helpMessage ?
                      <FormNote
                        key={`note-${group.field.id}`}
                        text={group.field.helpMessage}/> :
                      <></>
                  }
                  {
                    group.controls.map(
                      (item, idx) => <FieldControl
                        item={item} key={idx} schemaId={schema._id} />
                    )
                  }
                </TabPanel>
              );
            })
          }
          {
            hasSQLTab &&
              <TabPanel
                key={'sql-tab'}
                value={tabValue}
                index={finalGroups.length}
                classNameRoot={'FormView-fullSpace'}
                data-testid={'SQL'}
              >
                <SQLTab
                  active={(Object.keys(finalGroups).length === tabValue)}
                  getSQLValue={getSQLValue}
                />
              </TabPanel>
          }
        </FormContentBox>
        { showError && <ErrorMessageBox /> }
      </>
    );
  } else {
    let contentClassName = [
      isSingleCollection() ? 'FormView-singleCollectionPanelContent' :
        'FormView-nonTabPanelContent',
      (schemaState.errors?.message ? 'FormView-errorMargin' : null),
      (finalGroups.some((g)=>g.isFullTab) ? 'FormView-fullControl' : ''),
    ];
    return (
      <>
        <FormContentBox
          height="100%" display="flex" flexDirection="column"
          className={className}
          ref={formRef}
          data-test="form-view"
        >
          <TabPanel
            value={tabValue} index={0}
            classNameRoot={[
              isSingleCollection() ?
                'FormView-singleCollectionPanel' : 'FormView-nonTabPanel',
              className,
              (finalGroups.some((g)=>g.isFullTab) ? 'FormView-fullSpace' : ''),
            ].join(' ')}
            className={contentClassName.join(' ')}>
            {
              finalGroups.map((group, idx) =>
                <React.Fragment key={idx}>{
                  group.controls.map(
                    (item, idx) => <FieldControl
                      item={item} key={idx} schemaId={schema._id}
                    />
                  )
                }</React.Fragment>
              )
            }
            {
              hasSQLTab && <SQLTab active={true} getSQLValue={getSQLValue} />
            }
          </TabPanel>
        </FormContentBox>
        { showError && <ErrorMessageBox /> }
      </>
    );
  }
}


FormView.propTypes = {
  schema: CustomPropTypes.schemaUI,
  viewHelperProps: PropTypes.object,
  isNested: PropTypes.bool,
  isTabView: PropTypes.bool,
  accessPath: PropTypes.array.isRequired,
  dataDispatch: PropTypes.func,
  hasSQLTab: PropTypes.bool,
  getSQLValue: PropTypes.func,
  className: CustomPropTypes.className,
  field: PropTypes.object,
  showError: PropTypes.bool,
  resetKey: PropTypes.number,
  focusOnFirstInput: PropTypes.bool,
};

registerView(FormView, 'FormView');
