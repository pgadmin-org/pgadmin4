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
import pgAdmin from 'sources/pgadmin';
import ServerSchema from '../../../pgadmin/browser/server_groups/servers/static/js/server.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('ServerSchema', ()=>{
  let mount;
  let schemaObj = new ServerSchema([{
    label: 'Servers', value: 1,
  }], 0, {
    user_id: 'jasmine',
  });
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
    pgAdmin.Browser.utils.support_ssh_tunnel = true;
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

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('host', 'Either Host name or Service must be specified.');

    state.host = '127.0.0.1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('username', 'Username must be specified.');

    state.username = 'postgres';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('port', 'Port must be specified.');

    state.port = 5432;
    state.use_ssh_tunnel = true;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('tunnel_host', 'SSH Tunnel host must be specified.');

    state.service = 'pgservice';
    state.tunnel_host = 'localhost';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('tunnel_port', 'SSH Tunnel port must be specified.');

    state.tunnel_port = 8080;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('tunnel_username', 'SSH Tunnel username must be specified.');

    state.tunnel_username = 'jasmine';
    state.tunnel_authentication = true;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('tunnel_identity_file', 'SSH Tunnel identity file must be specified.');

    state.tunnel_identity_file = '/file/path/xyz.pem';
    expect(schemaObj.validate(state, setError)).toBeFalse();
  });
});
