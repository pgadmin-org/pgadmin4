/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import ForeignDataWrapperSchema from '../../../pgadmin/browser/server_groups/servers/databases/foreign_data_wrappers/static/js/foreign_data_wrapper.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('ForeignDataWrapperSchema', ()=>{

  const createSchemaObj = () => new ForeignDataWrapperSchema(
    ()=>new MockSchema(),
    {
      role: ()=>[],
      fdwhan: ()=>[],
      fdwvalue: ()=>[],
    },
    {
      fdwowner: 'postgres'
    }
  );
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

