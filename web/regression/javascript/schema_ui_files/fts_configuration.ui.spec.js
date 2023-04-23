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
import FTSConfigurationSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/fts_configurations/static/js/fts_configuration.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('FTSConfigurationSchema', ()=>{
  let mount;
  let schemaObj = new FTSConfigurationSchema(
    {
      role: ()=>[],
      schema: ()=>[],
      parsers: ()=>[],
      copyConfig: ()=>[],
      tokens: ()=>[],
      dictionaries: ()=>[],
    },
    {
      owner: 'postgres',
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

    state.prsname = '';
    state.copy_config = '';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('prsname', 'Select parser or configuration to copy.');

    state.prsname = 'default';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('prsname', null);
  });
});

