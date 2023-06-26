/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import ResourceGroupSchema from '../../../pgadmin/browser/server_groups/servers/resource_groups/static/js/resource_group.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('ResourceGroupSchema', ()=>{

  let schemaObj = new ResourceGroupSchema();
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

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();

    state.cpu_rate_limit = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('cpu_rate_limit', '\'CPU rate limit\' cannot be empty.');

    state.cpu_rate_limit = 1;
    state.dirty_rate_limit = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('dirty_rate_limit', '\'Dirty rate limit\' cannot be empty.');

    state.cpu_rate_limit = 1;
    state.dirty_rate_limit = 1;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('dirty_rate_limit', null);
  });
});

