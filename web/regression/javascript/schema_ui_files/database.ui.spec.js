/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';

import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import DatabaseSchema from '../../../pgadmin/browser/server_groups/servers/databases/static/js/database.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('DatabaseSchema', ()=>{

  let schemaObj = new DatabaseSchema(
    ()=>new MockSchema(),
    ()=>new MockSchema(),
    {
      role: ()=>[],
      encoding: ()=>[],
      template: ()=>[],
      spcname: ()=>[],
      datcollate: ()=>[],
      datctype: ()=>[],
    },
    {
      datowner: 'postgres',
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

  it('schema_res depChange', ()=>{
    let depChange = _.find(schemaObj.fields, (f)=>f.id=='schema_res').depChange;
    depChange({schema_res: 'abc'});
    expect(schemaObj.informText).toBe('Please refresh the Schemas node to make changes to the schema restriction take effect.');
  });
});
