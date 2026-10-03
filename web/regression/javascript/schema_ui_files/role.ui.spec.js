/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import RoleSchema from '../../../pgadmin/browser/server_groups/servers/roles/static/js/role.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('RoleSchema', ()=>{

  const createSchemaObject = () => new RoleSchema(
    ()=>new MockSchema(),
    ()=>new MockSchema(),
    {
      role: ()=>[],
      nodeInfo: {server: {user: {name:'postgres', id:0}}}
    },
  );
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(createSchemaObject());
  });

  it('edit', async ()=>{
    await getEditView(createSchemaObject(), getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(createSchemaObject(), getInitData);
  });

  describe('membersReadOnly', ()=>{
    it('is read only for a plain user who is not an admin member', ()=>{
      const schemaObj = createSchemaObject();
      const state = {oid: 123, rolmembers: [{role: 'postgres', admin: false}]};
      expect(schemaObj.membersReadOnly(state)).toBe(true);
    });

    it('is editable for a user with ADMIN OPTION on the role', ()=>{
      const schemaObj = createSchemaObject();
      const state = {oid: 123, rolmembers: [{role: 'postgres', admin: true}]};
      expect(schemaObj.membersReadOnly(state)).toBe(false);
    });

    it('is editable regardless when the user is a superuser/can create roles', ()=>{
      const schemaObj = new RoleSchema(
        ()=>new MockSchema(),
        ()=>new MockSchema(),
        {
          role: ()=>[],
          nodeInfo: {server: {user: {name: 'postgres', id: 0, is_superuser: true}}}
        },
      );
      const state = {oid: 123, rolmembers: []};
      expect(schemaObj.membersReadOnly(state)).toBe(false);
    });
  });
});

