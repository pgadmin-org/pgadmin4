/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import pgAdmin from 'sources/pgadmin';
import {messages} from '../fake_messages';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import LanguageSchema from '../../../pgadmin/browser/server_groups/servers/databases/languages/static/js/language.ui';

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
        user_name: 'postgres',
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
    jasmineEnzyme();
    /* messages used by validators */
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
    pgAdmin.Browser.utils = pgAdmin.Browser.utils || {};
  });

  it('create', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={schemaObj}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
      disableDialogHelp={false}
    />);
  });

  it('edit', ()=>{
    mount(<SchemaView
      formType='dialog'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'edit',
      }}
      onSave={()=>{}}
      onClose={()=>{}}
      onHelp={()=>{}}
      onEdit={()=>{}}
      onDataChange={()=>{}}
      confirmOnCloseReset={false}
      hasSQL={false}
      disableSqlHelp={false}
      disableDialogHelp={false}
    />);
  });

  it('properties', ()=>{
    mount(<SchemaView
      formType='tab'
      schema={schemaObj}
      getInitData={getInitData}
      viewHelperProps={{
        mode: 'properties',
      }}
      onHelp={()=>{}}
      onEdit={()=>{}}
    />);
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

