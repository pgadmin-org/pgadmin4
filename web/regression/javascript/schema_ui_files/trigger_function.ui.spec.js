/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import TriggerFunctionSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/functions/static/js/trigger_function.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('TriggerFunctionSchema', ()=>{

  const createSchemaObject = () => new TriggerFunctionSchema(
    ()=>new MockSchema(),
    ()=>new MockSchema(),
    {
      role: [],
      schema: [],
      language: [],
      nodeInfo: {}
    },
    {
      funcowner: 'postgres',
      pronamespace: 'public'
    }
  ); 
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(createSchemaObject());
  });

  it('edit', async ()=>{
    await getEditView(createSchemaObject(), getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(createSchemaObject(), getInitData);
  });

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();
    let schemaObj = createSchemaObject();

    state.prosrc = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('prosrc', 'Code cannot be empty.');

    state.prosrc = 'SELECT 1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('prosrc', null);
  });
});

