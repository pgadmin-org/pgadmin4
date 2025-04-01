/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import RuleSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/rules/static/js/rule.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('RuleSchema', ()=>{

  const createSchemaObject = () => new RuleSchema(
    {
      nodeInfo: {schema: {label: 'public'}, server: {version: 90400}},
      nodeData: {label: 'Test'}
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
});

