/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import DatabaseSchema from '../../../pgadmin/browser/server_groups/servers/databases/static/js/database.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('DatabaseSchema', ()=>{
  let mount;
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

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', ()=>{
    mount(getCreateView(schemaObj));
  });

  it('edit', ()=>{
    mount(getEditView(schemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(schemaObj, getInitData));
  });

  it('schema_res depChange', ()=>{
    let depChange = _.find(schemaObj.fields, (f)=>f.id=='schema_res').depChange;
    depChange({schema_res: 'abc'});
    expect(schemaObj.informText).toBe('Please refresh the Schemas node to make changes to the schema restriction take effect.');
  });
});
