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
import SubscriptionSchema from '../../../pgadmin/browser/server_groups/servers/databases/subscriptions/static/js/subscription.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('SubscriptionSchema', ()=>{
  let mount;
  let schemaObj = new SubscriptionSchema(
    {
      getPublication: ()=>[],
      role: ()=>[],
    },
    {
      node_info: {
        connected: true,
        user: {id: 10, name: 'postgres', is_superuser: true, can_create_role: true, can_create_db: true},
        user_id: 1,
        username: 'postgres',
        version: 130005,
        server: {host: '127.0.0.1', port: 5432},
      },
    },
    {
      subowner : 'postgres'
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


  it('copy_data_after_refresh readonly', ()=>{
    let isReadonly = _.find(schemaObj.fields, (f)=>f.id=='copy_data_after_refresh').readonly;
    let status = isReadonly({host: '127.0.0.1', port : 5432});
    expect(status).toBe(true);
  });

  it('copy_data_after_refresh readonly', ()=>{
    let isReadonly = _.find(schemaObj.fields, (f)=>f.id=='copy_data_after_refresh').readonly;
    let status = isReadonly({refresh_pub : true});
    expect(status).toBe(false);
  });

  it('validate', ()=>{
    let state = {};
    let setError = jasmine.createSpy('setError');

    state.host = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('host', 'Either Host name, Address must be specified.');

    state.host = '127.0.0.1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('username', 'Username must be specified.');

    state.username = 'postgres';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('port', 'Port must be specified.');

    state.port = 5432;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('pub', 'Publication must be specified.');

    state.pub = 'testPub';
    state.use_ssh_tunnel = 'Require';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('tunnel_host', 'SSH Tunnel host must be specified.');

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

