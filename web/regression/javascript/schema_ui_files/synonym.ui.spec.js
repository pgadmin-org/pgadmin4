/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import SynonymSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/synonyms/static/js/synonym.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('SynonymSchema', ()=>{

  let schemaObj = new SynonymSchema(
    {
      role: ()=>[],
      schema: ()=>[],
      synobjschema: ()=>[],
      getTargetObjectOptions: ()=>[],
    },
    [],
    {
      owner: 'postgres',
      schema: 'public',
      synobjschema: 'public',
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

    state.name = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('name', '\'Name\' cannot be empty.');

    state.name = 'my_syn';
    state.synobjschema = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('synobjschema', '\'Target schema\' cannot be empty.');

    state.synobjschema = 'public';
    state.synobjname = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('synobjname', '\'Target object\' cannot be empty.');
  });
});

