/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import AggregateSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/aggregates/static/js/aggregate.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('AggregateSchema', ()=>{

  let createSchemaObj = () => new AggregateSchema();
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(createSchemaObj());
  });

  it('edit', async ()=>{
    await getEditView(createSchemaObj(), getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(createSchemaObj(), getInitData);
  });
});

