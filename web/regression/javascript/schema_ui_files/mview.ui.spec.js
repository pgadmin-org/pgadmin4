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
import MViewSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/views/static/js/mview.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('MaterializedViewSchema', ()=>{
  let mount;
  let schemaObj = new MViewSchema(
    ()=>new MockSchema(),
    ()=>new MockSchema(),
    {
      role: ()=>[],
      schema: ()=>[],
      spcname: ()=>[],
    },
    {
      owner: 'postgres',
      schema: 'public'
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

    state.definition = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', 'Please enter view definition.');

    state.definition = 'SELECT 1;';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', null);

    state.definition = 'SELECT 1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', null);

    state.service = 'Test';
    state.definition = 'SELECT 1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', null);

  });
});

