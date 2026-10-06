/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import _ from 'lodash';
import pgAdmin from 'sources/pgadmin';
import current_user from 'pgadmin.user_management.current_user';
import ServerSchema from '../../../pgadmin/browser/server_groups/servers/static/js/server.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('ServerSchema', ()=>{

  const createSchemaObject = () => new ServerSchema([{
    label: 'Servers', value: 1,
  }], 0, {
    user_id: 'jasmine',
  });
  let schemaObj = createSchemaObject();
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
    pgAdmin.Browser.utils.support_ssh_tunnel = true;
  });

  it('create', async ()=>{
    await getCreateView(createSchemaObject());
  });

  it('edit', async ()=>{
    await getEditView(createSchemaObject(), getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(createSchemaObject(), getInitData);
  });

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('gid', 'Server group must be specified.');

    state.gid = 1;
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
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('tunnel_keep_alive', 'Keep alive must be specified. Specify 0 for no keep alive.');

    state.tunnel_keep_alive = 0;
    expect(schemaObj.validate(state, setError)).toBe(false);
  });

  describe('password exec command', ()=>{
    let origMode, origCommands, origUserId;
    const field = (schema, id) => _.find(schema.fields, (f)=>f.id==id);
    const setup = (serverMode, commands) => {
      pgAdmin.server_mode = serverMode;
      pgAdmin.server_passexec_commands = commands;
      return createSchemaObject();
    };

    beforeEach(()=>{
      origMode = pgAdmin.server_mode;
      origCommands = pgAdmin.server_passexec_commands;
      origUserId = current_user.id;
    });

    afterEach(()=>{
      pgAdmin.server_mode = origMode;
      pgAdmin.server_passexec_commands = origCommands;
      current_user.id = origUserId;
    });

    it('offers None and the configured names to an owner', ()=>{
      let schema = setup('True', ['vault']);
      let f = field(schema, 'passexec_name');
      expect(f.mode).toEqual(['properties', 'edit', 'create']);
      expect(f.visible({})).toBe(true);
      let type = f.type({id: 1, shared: false});
      expect(type.type).toBe('select');
      expect(type.options).toEqual([
        {label: 'None', value: '__none__'},
        {label: 'vault', value: 'vault'},
      ]);
      expect(field(schema, 'passexec_cmd').visible({})).toBe(false);
    });

    it('offers Inherit from owner to a non-owner of a shared server', ()=>{
      let schema = setup('True', ['vault']);
      current_user.id = 2;
      schema.userId = 1;
      let type = field(schema, 'passexec_name').type({id: 5, shared: true});
      expect(type.options).toEqual([
        {label: 'Inherit from owner', value: '__inherit__'},
        {label: 'None', value: '__none__'},
        {label: 'vault', value: 'vault'},
      ]);
    });

    it('does not offer Inherit to the owner of a shared server', ()=>{
      let schema = setup('True', ['vault']);
      current_user.id = 1;
      schema.userId = 1;
      let type = field(schema, 'passexec_name').type({id: 5, shared: true});
      expect(type.options.map((o)=>o.value)).toEqual(['__none__', 'vault']);
    });

    it('hides the select when no commands are configured', ()=>{
      let schema = setup('True', []);
      expect(field(schema, 'passexec_name').visible({})).toBe(false);
      expect(field(schema, 'passexec_cmd').visible({})).toBe(false);
    });

    it('shows the free text command only in desktop mode', ()=>{
      let schema = setup('False', []);
      expect(field(schema, 'passexec_cmd').visible({})).toBe(true);
      expect(field(schema, 'passexec_name').visible({})).toBe(false);
    });

    it('disables the expiration according to the mode', ()=>{
      let schema = setup('True', ['vault']);
      let disabled = field(schema, 'passexec_expiration').disabled;
      expect(disabled({passexec_name: '__none__'})).toBe(true);
      expect(disabled({passexec_name: '__inherit__'})).toBe(true);
      expect(disabled({passexec_name: 'vault'})).toBe(false);

      schema = setup('False', []);
      disabled = field(schema, 'passexec_expiration').disabled;
      expect(disabled({passexec_cmd: ''})).toBe(true);
      expect(disabled({passexec_cmd: 'echo x'})).toBe(false);
    });

    it('defaults to None in server mode', ()=>{
      expect(setup('True', ['vault']).defaults.passexec_name).toBe('__none__');
      expect(setup('False', []).defaults.passexec_name).toBeUndefined();
    });
  });
});
