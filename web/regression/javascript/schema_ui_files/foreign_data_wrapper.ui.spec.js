/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
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

  let schemaObj = new ForeignDataWrapperSchema(
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
    await getCreateView(schemaObj);
  });

  it('edit', async ()=>{
    await getEditView(schemaObj, getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(schemaObj, getInitData);
  });
});

