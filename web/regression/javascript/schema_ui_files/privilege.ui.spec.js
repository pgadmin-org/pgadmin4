/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import PrivilegeRoleSchema, {getNodePrivilegeRoleSchema} from '../../../pgadmin/browser/server_groups/servers/static/js/privilege.ui';
import {DefaultPrivSchema} from '../../../pgadmin/browser/server_groups/servers/databases/static/js/database.ui';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import {addNewDatagridRow, genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('PrivilegeSchema', ()=>{

  let schemaObj = new PrivilegeRoleSchema(
    ()=>[],
    ()=>[],
    null,
    {server: {user: {name: 'postgres'}}},
    ['X']
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

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('privileges', 'At least one privilege should be selected.');
  });

  it('DefaultPrivSchema', async ()=>{
    jest.spyOn(nodeAjax, 'getNodeListByName').mockReturnValue([]);
    let defPrivObj = new DefaultPrivSchema((privileges)=>getNodePrivilegeRoleSchema({}, {server: {user: {name: 'postgres'}}}, {}, privileges));
    let {ctrl, user} = await getCreateView(defPrivObj);
    await addNewDatagridRow(user, ctrl);
  });
});
