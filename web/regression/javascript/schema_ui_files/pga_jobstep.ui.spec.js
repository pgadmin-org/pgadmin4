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
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import PgaJobStepSchema from '../../../pgadmin/browser/server_groups/servers/pgagent/steps/static/js/pga_jobstep.ui';

describe('PgaJobStepSchema', ()=>{
  let mount;
  let schemaObj = new PgaJobStepSchema(
    {
      databases: ()=>[],
    },
    [],
    {
      jstdbname: 'postgres',
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

    state.name = 'my_step';
    state.jstkind = true;
    state.jstconntype = true;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstdbname', 'Please select a database.');

    state.jstdbname = 'postgres';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstdbname', null);

    state.jstconntype = false;
    state.jstconnstr = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstconnstr', 'Please enter a connection string.');

    state.jstconnstr = '**!!';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstconnstr', 'Please enter a connection string.');

    state.jstconnstr = 'host:\'192.168.1.7\'';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstconnstr', 'Please enter a valid connection string.');

    state.jstconnstr = 'host:\'192.168.1.7\'';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstconnstr', 'Please enter a valid connection string.');

    state.jstconnstr = 'hostaddrtest=\'192.168.1.7\'';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstconnstr', 'Invalid parameter in the connection string - hostaddrtest.');

    state.jstconnstr = 'host=\'192.168.1.7\' port=5432';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstconnstr', null);

    state.jstcode = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstcode', 'Please specify code to execute.');

    state.jstcode = 'PERFORM 1;';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstcode', null);

    state.jstonerror = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstonerror', 'Please select valid on error option.');

    state.jstonerror = 'f';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jstonerror', null);
  });
});

