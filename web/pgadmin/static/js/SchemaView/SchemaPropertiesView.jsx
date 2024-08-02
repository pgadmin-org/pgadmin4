/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useState } from 'react';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/InfoRounded';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import _ from 'lodash';
import PropTypes from 'prop-types';

import { usePgAdmin } from 'sources/BrowserComponent';
import gettext from 'sources/gettext';
import Loader from 'sources/components/Loader';
import { PgIconButton, PgButtonGroup } from 'sources/components/Buttons';
import CustomPropTypes from 'sources/custom_prop_types';

import DataGridView from './DataGridView';
import FieldSetView from './FieldSetView';
import { MappedFormControl } from './MappedControl';
import { useSchemaState } from './useSchemaState';
import { getFieldMetaData } from './common';

import { StyledBox } from './StyledComponents';


/* If its the properties tab */
export default function SchemaPropertiesView({
  getInitData, viewHelperProps, schema={}, updatedData, ...props
}) {
  let defaultTab = 'General';
  let tabs = {};
  let tabsClassname = {};
  let groupLabels = {};
  const [loaderText, setLoaderText] = useState('');

  const pgAdmin = usePgAdmin();
  const Notifier = pgAdmin.Browser.notifier;
  const { mode, keepCid } = viewHelperProps;

  // Schema data state manager
  const {schemaState, sessData} = useSchemaState({
    schema: schema, getInitData: getInitData, immutableData: updatedData,
    mode: mode, keepCid: keepCid, onDataChange: null,
  });
  const [data, setData] = useState({});

  useEffect(() => {
    if (schemaState.errors?.response)
      Notifier.pgRespErrorNotify(schemaState.errors.response);
  }, [schemaState.errors?.name]);

  useEffect(() => {
    setData(sessData);
  }, [sessData.__changeId]);

  useEffect(() => {
    setLoaderText(schemaState.message);
  }, [schemaState.message]);

  /* A simple loop to get all the controls for the fields */
  schema.fields.forEach((field) => {
    let {group} = field;
    const {
      visible, disabled, readonly, modeSupported
    } = getFieldMetaData(field, schema, data, viewHelperProps);
    group = group || defaultTab;

    if(field.isFullTab) {
      tabsClassname[group] = 'Properties-noPadding';
    }

    if(!modeSupported) return;

    group = groupLabels[group] || group || defaultTab;
    if (field.helpMessageMode?.indexOf(viewHelperProps.mode) == -1)
      field.helpMessage = '';

    if(!tabs[group]) tabs[group] = [];

    if(field && field.type === 'nested-fieldset') {
      tabs[group].push(
        <FieldSetView
          key={`nested${tabs[group].length}`}
          value={data}
          viewHelperProps={viewHelperProps}
          schema={field.schema}
          accessPath={[]}
          controlClassName='Properties-controlRow'
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
          value={data[field.id] || []}
          schema={field.schema}
          accessPath={[field.id]}
          containerClassName='Properties-controlRow'
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
          state={sessData}
          name={field.id}
          value={data[field.id]}
          {...field}
          readonly={readonly}
          disabled={disabled}
          visible={visible}
          className={field.isFullTab ? null :'Properties-controlRow'}
          noLabel={field.isFullTab}
          memoDeps={[
            data[field.id],
            'Properties-controlRow',
            field.isFullTab
          ]}
        />
      );
    }
  });

  let finalTabs = _.pickBy(
    tabs, (v, tabName) => schema.filterGroups.indexOf(tabName) <= -1
  );

  return (
    <StyledBox>
      <Loader message={loaderText}/>
      <Box className='Properties-toolbar'>
        <PgButtonGroup size="small">
          <PgIconButton
            data-test="help" onClick={() => props.onHelp(true, false)}
            icon={<InfoIcon />} disabled={props.disableSqlHelp}
            title="SQL help for this object type." />
          <PgIconButton data-test="edit"
            onClick={props.onEdit} icon={<EditIcon />}
            title={gettext('Edit object...')} />
        </PgButtonGroup>
      </Box>
      <Box className={'Properties-form'}>
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
    </StyledBox>
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
    keepCid: PropTypes.bool,
  }).isRequired,
  schema: CustomPropTypes.schemaUI,
  onHelp: PropTypes.func,
  disableSqlHelp: PropTypes.bool,
  onEdit: PropTypes.func,
  resetKey: PropTypes.any,
  itemNodeData: PropTypes.object
};

