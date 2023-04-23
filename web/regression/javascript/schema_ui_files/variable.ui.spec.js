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
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import VariableSchema, {getNodeVariableSchema} from '../../../pgadmin/browser/server_groups/servers/static/js/variable.ui';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

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

  it('getValueFieldProps', ()=>{
    expect(schemaObj.getValueFieldProps({vartype: 'bool'})).toBe('switch');
    expect(schemaObj.getValueFieldProps({vartype: 'enum', enumvals: []})).toEqual(jasmine.objectContaining({
      cell: 'select',
    }));
    expect(schemaObj.getValueFieldProps({vartype: 'integer'})).toEqual(jasmine.objectContaining({
      cell: 'int',
    }));
    expect(schemaObj.getValueFieldProps({vartype: 'real'})).toEqual(jasmine.objectContaining({
      cell: 'numeric',
    }));
    expect(schemaObj.getValueFieldProps({vartype: 'string'})).toEqual(jasmine.objectContaining({
      cell: 'text',
    }));
    expect(schemaObj.getValueFieldProps({vartype: 'file'})).toEqual(jasmine.objectContaining({
      cell: 'file',
    }));
    expect(schemaObj.getValueFieldProps({})).toBe('');
  });

  it('variable collection', ()=>{
    spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue([]);
    spyOn(nodeAjax, 'getNodeListByName').and.returnValue([]);
    let varCollObj = new MockSchema(()=>getNodeVariableSchema({}, {server: {user: {name: 'postgres'}}}, {}, true, true));
    let ctrl = mount(getCreateView(varCollObj));
    /* Make sure you hit every corner */
    ctrl.find('DataGridView').at(0).find('PgIconButton[data-test="add-row"]').find('button').simulate('click');
  });
});
