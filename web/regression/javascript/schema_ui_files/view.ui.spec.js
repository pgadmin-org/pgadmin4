/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import ViewSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/views/static/js/view.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('ViewSchema', ()=>{

  let schemaObj = new ViewSchema(
    ()=>new MockSchema(),
    {server: {server_type: 'pg'}},
    {
      role: ()=>[],
      schema: ()=>[],
    },
    {
      owner: 'postgres',
      schema: 'public'
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

    state.definition = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', 'Please enter view code.');

    state.definition = 'SELECT 1;';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', null);

    state.definition = 'SELECT 1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', null);

    state.service = 'Test';
    state.definition = 'SELECT 1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', null);

  });
});

