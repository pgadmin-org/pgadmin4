/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import RowSecurityPolicySchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/row_security_policies/static/js/row_security_policy.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('RowSecurityPolicySchema', ()=>{

  const createSchemaObject = () => new RowSecurityPolicySchema(
    {
      role: ()=>[],
      nodeInfo: {server: {version: 90400}},
    }
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
});

