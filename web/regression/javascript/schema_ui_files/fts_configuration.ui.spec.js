/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import FTSConfigurationSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/fts_configurations/static/js/fts_configuration.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('FTSConfigurationSchema', ()=>{

  const createSchemaObj = () => new FTSConfigurationSchema(
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
  let schemaObj = createSchemaObj();
  let getInitData = () => Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(createSchemaObj());
  });

  it('edit', async ()=>{
    await getEditView(createSchemaObj(), getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(createSchemaObj(), getInitData);
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

