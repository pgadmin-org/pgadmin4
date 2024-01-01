/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import ExtensionsSchema from '../../../pgadmin/browser/server_groups/servers/databases/extensions/static/js/extension.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('ExtensionSchema', ()=>{

  let schemaObj = new ExtensionsSchema(
    {
      extensionsList: ()=>[],
      schemaList: ()=>[],
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
    expect(setError).toHaveBeenCalledWith('name', 'Name cannot be empty.');
  });
});

