/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import {getNodePrivilegeRoleSchema} from '../../../pgadmin/browser/server_groups/servers/static/js/privilege.ui';
import PGSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/static/js/schema.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('PGSchema', ()=>{

  let schemaObj = new PGSchema(
    ()=>getNodePrivilegeRoleSchema({}, {server: {user: {name: 'postgres'}}}, {}),
    {
      roles:() => [],
      namespaceowner: '',
    }
  );
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(schemaObj);
  });

  it('schema validate', () => {
    let state = { name: 'abc' };
    let setError = jest.fn();

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('namespaceowner', 'Owner cannot be empty.');

    state.namespaceowner = 'postgres';
    let validate = schemaObj.validate(state, setError);
    expect(validate).toBe(null);
  });

  it('edit', async ()=>{
    await getEditView(schemaObj, getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(schemaObj, getInitData);
  });
});

