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
import TriggerFunctionSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/functions/static/js/trigger_function.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('TriggerFunctionSchema', ()=>{
  let mount;
  let schemaObj = new TriggerFunctionSchema(
    ()=>new MockSchema(),
    ()=>new MockSchema(),
    {
      role: [],
      schema: [],
      language: [],
      nodeInfo: {}
    },
    {
      funcowner: 'postgres',
      pronamespace: 'public'
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

  it('validate', ()=>{
    let state = {};
    let setError = jasmine.createSpy('setError');

    state.prosrc = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('prosrc', 'Code cannot be empty.');

    state.prosrc = 'SELECT 1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('prosrc', null);
  });
});

