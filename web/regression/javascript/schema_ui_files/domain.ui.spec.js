/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import DomainSchema, { DomainConstSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/domains/static/js/domain.ui';
import {addNewDatagridRow, genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('DomainSchema', ()=>{

  let schemaObj = new DomainSchema(
    {
      role: ()=>[],
      schema: ()=>[],
      basetype: ()=>['character varying', 'numeric'],
      collation: ()=>[],
    },
    [],
    {
      owner: 'postgres',
      schema: 'public',
      basensp: 'public',
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
});

/* Used to check collection mode */
class MockSchema extends BaseUISchema {
  constructor() {
    super();
  }

  get baseFields() {
    return [{
      id: 'constraint', label: '', type: 'collection',
      schema: new DomainConstSchema(),
      editable: false,
      group: 'Constraints', mode: ['edit', 'create'],
      canAdd: true, canEdit: false, canDelete: true, hasRole: true,
      node: 'role',
    }];
  }
}

describe('DomainConstSchema', ()=>{

  let schemaObj = new MockSchema();
  let domainConstObj = new DomainConstSchema();
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    const {ctrl, user} = await getCreateView(schemaObj);

    /* Make sure you hit every corner */

    await addNewDatagridRow(user, ctrl);
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

    state.conname = undefined;
    domainConstObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('conname', 'Constraint Name cannot be empty.');

    state.conname = 'my_syn';
    state.consrc = undefined;
    domainConstObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('consrc', 'Constraint Check cannot be empty.');

    state.consrc = 'public';
    domainConstObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('consrc', null);
  });
});
