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
import ResourceGroupSchema from '../../../pgadmin/browser/server_groups/servers/resource_groups/static/js/resource_group.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('ResourceGroupSchema', ()=>{
  let mount;
  let schemaObj = new ResourceGroupSchema();
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

