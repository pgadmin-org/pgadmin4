/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import PrivilegeRoleSchema, {getNodePrivilegeRoleSchema} from '../../../pgadmin/browser/server_groups/servers/static/js/privilege.ui';
import {DefaultPrivSchema} from '../../../pgadmin/browser/server_groups/servers/databases/static/js/database.ui';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('PrivilegeSchema', ()=>{
  let mount;
  let schemaObj = new PrivilegeRoleSchema(
    ()=>[],
    ()=>[],
    null,
    {server: {user: {name: 'postgres'}}},
    ['X']
  );
  let getInitData = ()=>Promise.resolve({});

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', ()=>{
    mount(getCreateView(schemaObj));
  });

  it('edit', ()=>{
    mount(getEditView(schemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(schemaObj, getInitData));
  });

  it('validate', ()=>{
    let state = {};
    let setError = jasmine.createSpy('setError');

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('privileges', 'At least one privilege should be selected.');
  });

  it('DefaultPrivSchema', ()=>{
    spyOn(nodeAjax, 'getNodeListByName').and.returnValue([]);
    let defPrivObj = new DefaultPrivSchema((privileges)=>getNodePrivilegeRoleSchema({}, {server: {user: {name: 'postgres'}}}, {}, privileges));
    let ctrl = mount(getCreateView(defPrivObj));
    /* Make sure you hit every corner */
    ctrl.find('DataGridView').at(0).find('PgIconButton[data-test="add-row"]').find('button').simulate('click');
  });
});
