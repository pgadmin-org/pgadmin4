/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import VariableSchema, {getNodeVariableSchema} from '../../../pgadmin/browser/server_groups/servers/static/js/variable.ui';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import {addNewDatagridRow, genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

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

  let schemaObj = new VariableSchema(
    ()=>[],
    ()=>[],
    ()=>[],
    null
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

  it('getValueFieldProps', ()=>{
    expect(schemaObj.getValueFieldProps({vartype: 'bool'})).toBe('switch');
    expect(schemaObj.getValueFieldProps({vartype: 'enum', enumvals: []})).toEqual(expect.objectContaining({
      cell: 'select',
    }));
    expect(schemaObj.getValueFieldProps({vartype: 'integer'})).toEqual(expect.objectContaining({
      cell: 'int',
    }));
    expect(schemaObj.getValueFieldProps({vartype: 'real'})).toEqual(expect.objectContaining({
      cell: 'numeric',
    }));
    expect(schemaObj.getValueFieldProps({vartype: 'string'})).toEqual(expect.objectContaining({
      cell: 'text',
    }));
    expect(schemaObj.getValueFieldProps({vartype: 'file'})).toEqual(expect.objectContaining({
      cell: 'file',
    }));
    expect(schemaObj.getValueFieldProps({})).toBe('');
  });

  it('variable collection', async ()=>{
    jest.spyOn(nodeAjax, 'getNodeAjaxOptions').mockReturnValue([]);
    jest.spyOn(nodeAjax, 'getNodeListByName').mockReturnValue([]);
    let varCollObj = new MockSchema(()=>getNodeVariableSchema({}, {server: {user: {name: 'postgres'}}}, {}, true, true));
    const {ctrl, user} = await getCreateView(varCollObj);
    /* Make sure you hit every corner */

    await addNewDatagridRow(user, ctrl);
  });
});
