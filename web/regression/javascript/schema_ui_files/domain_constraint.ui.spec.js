/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import DomainConstraintSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/domains/domain_constraints/static/js/domain_constraints.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('DomainConstraintSchema', ()=>{

  let createSchemaObj = () => new DomainConstraintSchema();
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

