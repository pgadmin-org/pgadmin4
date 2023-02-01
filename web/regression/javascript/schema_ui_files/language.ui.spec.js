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
import LanguageSchema from '../../../pgadmin/browser/server_groups/servers/databases/languages/static/js/language.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('LanguageSchema', ()=>{
  let mount;
  let schemaObj = new LanguageSchema(
    ()=>new MockSchema(),
    {
      lan_functions: ()=>[],
      templates_data: ()=>[],
    },
    {
      node_info: {connected: true,
        user: {id: 10, name: 'postgres', is_superuser: true, can_create_role: true, can_create_db: true},
        user_id: 1,
        username: 'postgres',
        version: 120005,
      },
    },
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

  it('validate', ()=>{
    let state = {};
    let setError = jasmine.createSpy('setError');

    state.lanproc = '';
    schemaObj.isTemplate = true;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('lanproc', 'Handler function cannot be empty.');

    state.lanproc = 'my_len';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('lanproc', null);
  });
});

