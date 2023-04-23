/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import ForeignServerSchema from '../../../pgadmin/browser/server_groups/servers/databases/foreign_data_wrappers/foreign_servers/static/js/foreign_server.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('ForeignServerSchema', ()=>{
  let mount;
  let schemaObj = new ForeignServerSchema(
    ()=>new MockSchema(),
    {
      role: ()=>[],
    },
    {
      fsrvowner: 'postgres'
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
});

