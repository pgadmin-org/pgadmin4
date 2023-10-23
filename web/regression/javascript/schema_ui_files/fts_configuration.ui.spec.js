/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import FTSConfigurationSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/fts_configurations/static/js/fts_configuration.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('FTSConfigurationSchema', ()=>{

  let schemaObj = new FTSConfigurationSchema(
    {
      role: ()=>[],
      schema: ()=>[],
      parsers: ()=>[],
      copyConfig: ()=>[],
      tokens: ()=>[],
      dictionaries: ()=>[],
    },
    {
      owner: 'postgres',
      schema: 'public',
    }
  );
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(schemaObj);
  });

  it('edit', async ()=>{
    await getEditView(schemaObj, getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(schemaObj, getInitData);
  });

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();

    state.prsname = '';
    state.copy_config = '';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('prsname', 'Select parser or configuration to copy.');

    state.prsname = 'default';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('prsname', null);
  });
});

