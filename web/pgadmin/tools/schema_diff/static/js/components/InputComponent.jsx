/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import PropTypes from 'prop-types';

import React, { useContext, useState, useEffect } from 'react';

import { Box, Grid, Typography } from '@mui/material';

import { InputSelect } from '../../../../../static/js/components/FormComponents';
import { SchemaDiffEventsContext } from './SchemaDiffComponent';
import { SCHEMA_DIFF_EVENT } from '../SchemaDiffConstants';


export function InputComponent({ label, serverList, databaseList, schemaList, diff_type, selectedSid = null, selectedDid=null, selectedScid=null, onServerSchemaChange }) {
  const [selectedServer, setSelectedServer] = useState(selectedSid);
  const [selectedDatabase, setSelectedDatabase] = useState(selectedDid);
  const [selectedSchema, setSelectedSchema] = useState(selectedScid);
  const eventBus = useContext(SchemaDiffEventsContext);
  const [disableDBSelection, setDisableDBSelection] = useState(selectedSid == null);
  const [disableSchemaSelection, setDisableSchemaSelection] = useState(selectedDid == null);

  useEffect(() => {
    setSelectedDatabase(selectedDid);
    if (selectedDid) setDisableSchemaSelection(false);
  }, [selectedSid, selectedDid, selectedScid]);

  const changeServer = (selectedOption) => {
    setDisableDBSelection(false);
    setSelectedServer(selectedOption);
    // Reset the Database selection if user deselect server from DD
    if(selectedOption == null){
      setSelectedDatabase(null);
      setDisableDBSelection(true);
      setSelectedSchema(null);
      setDisableSchemaSelection(true);
    }
    eventBus.fireEvent(SCHEMA_DIFF_EVENT.TRIGGER_SELECT_SERVER, { selectedOption, diff_type, serverList });
  };

  const changeDatabase = (selectedDB) => {
    setSelectedDatabase(selectedDB);
    setDisableSchemaSelection(false);
    // Reset the Schema selection if user deselect database from DD
    if(selectedDB == null){
      setSelectedSchema(null);
      setDisableSchemaSelection(true);
    }
    eventBus.fireEvent(SCHEMA_DIFF_EVENT.TRIGGER_SELECT_DATABASE, {selectedServer, selectedDB, diff_type, databaseList});
    onServerSchemaChange();
  };

  const changeSchema = (selectedSC) => {
    setSelectedSchema(selectedSC);
    eventBus.fireEvent(SCHEMA_DIFF_EVENT.TRIGGER_SELECT_SCHEMA, { selectedSC, diff_type });
    onServerSchemaChange();
  };

  return (
    <Box sx={{padding: '0rem'}}>
      <Grid
        container
        direction="row"
        alignItems="center"
      >
        <Grid item lg={2} md={2} sm={2} xs={2} sx={{padding: '0.3rem'}}>
          <Typography id={label}>{label}</Typography>
        </Grid>
        <Grid item lg={4} md={4} sm={4} xs={4} sx={{padding: '0.3rem'}}>
          <InputSelect
            options={serverList}
            optionsReloadBasis={serverList?.length}
            onChange={changeServer}
            value={selectedServer}
            controlProps={
              {
                placeholder: 'Select server...'
              }
            }
            key={'server_' + diff_type}
          ></InputSelect>
        </Grid>

        <Grid item lg={3} md={3} sm={3} xs={3} sx={{padding: '0.3rem'}}>
          <InputSelect
            options={databaseList}
            optionsReloadBasis={databaseList?.map ? _.join(databaseList.map((c)=>c.value), ',') : null}
            onChange={changeDatabase}
            value={selectedDatabase}
            controlProps={
              {
                placeholder: 'Select Database...'
              }
            }
            key={'database_' + diff_type}
            readonly={disableDBSelection}
          ></InputSelect>
        </Grid>

        <Grid item lg={3} md={3} sm={3} xs={3} sx={{padding: '0.3rem'}}>
          <InputSelect
            options={schemaList}
            optionsReloadBasis={schemaList?.map ? _.join(schemaList.map((c)=>c.value), ',') : null}
            onChange={changeSchema}
            value={selectedSchema}
            controlProps={
              {
                placeholder: 'Select Schema...'
              }
            }
            key={'schema' + diff_type}
            readonly={disableSchemaSelection}
          ></InputSelect>
        </Grid>
      </Grid>
    </Box >
  );
}

InputComponent.propTypes = {
  label: PropTypes.string,
  serverList: PropTypes.array,
  databaseList:PropTypes.array,
  schemaList:PropTypes.array,
  diff_type:PropTypes.number,
  selectedSid: PropTypes.number,
  selectedDid: PropTypes.number,
  selectedScid:PropTypes.number,
  onServerSchemaChange:PropTypes.func
};
