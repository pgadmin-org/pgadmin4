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
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import SequenceSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/sequences/static/js/sequence.ui';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('SequenceSchema', ()=>{
  let mount;
  let schemaObj = new SequenceSchema(
    ()=>new MockSchema(),
    {
      role: ()=>[],
    },
    {
      seqowner: 'postgres',
      schema: 'public',
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

    state.seqowner = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('seqowner', '\'Owner\' cannot be empty.');

    state.seqowner = 'postgres';
    state.schema = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('schema', '\'Schema\' cannot be empty.');

    state.schema = 'public';
    state.oid = 12345;
    state.current_value = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('current_value', '\'Current value\' cannot be empty.');

    state.current_value = 10;
    state.increment = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('increment', '\'Increment value\' cannot be empty.');


    state.increment = 1;
    state.minimum = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('minimum', '\'Minimum value\' cannot be empty.');

    state.minimum = 5;
    state.maximum = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('maximum', '\'Maximum value\' cannot be empty.');

    state.maximum = 200;
    state.cache = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('cache', '\'Cache value\' cannot be empty.');

    state.cache = 1;
    state.minimum = 10;
    state.maximum = 5;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('minimum', 'Minimum value must be less than maximum value.');

    state.start = 5;
    state.minimum = 10;
    state.maximum = 50;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('start', 'Start value cannot be less than minimum value.');

    state.start = 500;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('start', 'Start value cannot be greater than maximum value.');
  });
});

