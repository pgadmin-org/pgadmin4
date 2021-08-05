/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import pgAdmin from 'sources/pgadmin';
import {messages} from '../fake_messages';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import VariableSchema, {getNodeVariableSchema} from '../../../pgadmin/browser/server_groups/servers/static/js/variable.ui';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';


/* Used to check collection mode */
class MockSchema extends BaseUISchema {
  constructor(getVariableSchema) {
    super();
    this.getVariableSchema = getVariableSchema;
  }

  get baseFields() {
    return [{
      id: 'variables', label: '', type: 'collection',
      schema: this.getVariableSchema(),
      editable: false,
      group: 'Parameters', mode: ['edit', 'create'],
      canAdd: true, canEdit: false, canDelete: true, hasRole: true,
      node: 'role',
    }];
  }
}

describe('VariableSchema', ()=>{
  let mount;
  let schemaObj = new VariableSchema(
    ()=>[],
    ()=>[],
    ()=>[],
    null
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
    jasmineEnzyme();
    /* messages used by validators */
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
    pgAdmin.Browser.utils = pgAdmin.Browser.utils || {};
    pgAdmin.Browser.utils.support_ssh_tunnel = true;
  });

  it('create', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={schemaObj}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
      disableDialogHelp={false}
    />);
  });

  it('edit', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
      disableDialogHelp={false}
    />);
  });

  it('properties', ()=>{
    mount(<SchemaView
      formType='tab'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'properties',
      }}
      onHelp={()=>{}}
      onEdit={()=>{}}
    />);
  });

  it('getValueFieldProps', ()=>{
    expect(schemaObj.getValueFieldProps({vartype: 'bool'})).toBe('switch');
    expect(schemaObj.getValueFieldProps({vartype: 'enum', enumvals: []})).toEqual(jasmine.objectContaining({
      cell: 'select',
    }));
    expect(schemaObj.getValueFieldProps({vartype: 'integer'})).toBe('int');
    expect(schemaObj.getValueFieldProps({vartype: 'real'})).toBe('numeric');
    expect(schemaObj.getValueFieldProps({vartype: 'string'})).toBe('text');
    expect(schemaObj.getValueFieldProps({})).toBe('');
  });

  it('variable collection', ()=>{
    spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue([]);
    spyOn(nodeAjax, 'getNodeListByName').and.returnValue([]);
    let varCollObj = new MockSchema(()=>getNodeVariableSchema({}, {server: {user: {name: 'postgres'}}}, {}, true, true));
    let ctrl = mount(<SchemaView
      formType='dialog'
      schema={varCollObj}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
      disableDialogHelp={false}
    />);
    /* Make sure you hit every corner */
    ctrl.find('DataGridView').at(0).find('PgIconButton[data-test="add-row"]').find('button').simulate('click');
  });


});
