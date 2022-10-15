/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import _ from 'lodash';
import {Address4, Address6} from 'ip-address';


import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import pgAdmin from 'sources/pgadmin';
import {default as supportedServers} from 'pgadmin.server.supported_servers';

import current_user from 'pgadmin.user_management.current_user';
import { isEmptyString } from 'sources/validators';

export default class ServerSchema extends BaseUISchema {
  constructor(serverGroupOptions=[], userId=0, initValues={}) {
    super({
      gid: undefined,
      id: undefined,
      name: '',
      bgcolor: '',
      fgcolor: '',
      sslmode: 'prefer',
      host: '',
      hostaddr: '',
      port: 5432,
      db: 'postgres',
      username: current_user.name,
      role: null,
      connect_now: true,
      password: undefined,
      save_password: false,
      db_res: [],
      passfile: undefined,
      passexec: undefined,
      passexec_expiration: undefined,
      sslcompression: false,
      sslcert: undefined,
      sslkey: undefined,
      sslrootcert: undefined,
      sslcrl: undefined,
      service: undefined,
      use_ssh_tunnel: 0,
      tunnel_host: undefined,
      tunnel_port: 22,
      tunnel_username: undefined,
      tunnel_identity_file: undefined,
      tunnel_password: undefined,
      tunnel_authentication: false,
      save_tunnel_password: false,
      connect_timeout: 10,
      ...initValues,
    });

    this.serverGroupOptions = serverGroupOptions;
    this.userId = userId;
    _.bindAll(this, 'isShared', 'isSSL');
  }

  get SSL_MODES() { return ['prefer', 'require', 'verify-ca', 'verify-full']; }

  isShared(state) {
    return !this.isNew(state) && this.userId != current_user.id && state.shared;
  }

  isConnected(state) {
    return Boolean(state.connected);
  }

  isSSL(state) {
    return this.SSL_MODES.indexOf(state.sslmode) == -1;
  }

  isValidLib() {
    // older version of libpq do not support 'passfile' parameter in
    // connect method, valid libpq must have version >= 100000
    return pgAdmin.Browser.utils.pg_libpq_version < 100000;
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'id', label: gettext('ID'), type: 'int', group: null,
        mode: ['properties'],
      },{
        id: 'name', label: gettext('Name'), type: 'text', group: null,
        mode: ['properties', 'edit', 'create'], noEmpty: true,
        disabled: obj.isShared,
      },{
        id: 'gid', label: gettext('Server group'), type: 'select',
        options: obj.serverGroupOptions,
        mode: ['create', 'edit'],
        controlProps: { allowClear: false },
        disabled: obj.isShared,
      },
      {
        id: 'server_owner', label: gettext('Shared Server Owner'), type: 'text', mode: ['properties'],
        visible: function(state) {
          let serverOwner = obj.userId;
          return state.shared && serverOwner != current_user.id && pgAdmin.server_mode == 'True';
        },
      },
      {
        id: 'server_type', label: gettext('Server type'), type: 'select',
        mode: ['properties'], visible: obj.isConnected,
        options: supportedServers,
      }, {
        id: 'connected', label: gettext('Connected?'), type: 'switch',
        mode: ['properties'], group: gettext('Connection'),
      }, {
        id: 'version', label: gettext('Version'), type: 'text', group: null,
        mode: ['properties'], visible: obj.isConnected,
      },
      {
        id: 'bgcolor', label: gettext('Background'), type: 'color',
        group: null, mode: ['edit', 'create'],
        disabled: obj.isConnected, deps: ['fgcolor'], depChange: (state)=>{
          if(!state.bgcolor && state.fgcolor) {
            return {'bgcolor': '#ffffff'};
          }
        }
      },{
        id: 'fgcolor', label: gettext('Foreground'), type: 'color',
        group: null, mode: ['edit', 'create'], disabled: obj.isConnected,
      },
      {
        id: 'connect_now', label: gettext('Connect now?'), type: 'switch',
        group: null, mode: ['create'],
      },
      {
        id: 'shared', label: gettext('Shared?'), type: 'switch',
        mode: ['properties', 'create', 'edit'],
        readonly: function(state){
          let serverOwner = obj.userId;
          return !obj.isNew(state) && serverOwner != current_user.id;
        }, visible: function(){
          return current_user.is_admin && pgAdmin.server_mode == 'True';
        },
      },
      {
        id: 'comment', label: gettext('Comments'), type: 'multiline', group: null,
        mode: ['properties', 'edit', 'create'],
      },
      {
        id: 'host', label: gettext('Host name/address'), type: 'text', group: gettext('Connection'),
        mode: ['properties', 'edit', 'create'], disabled: obj.isShared,
        depChange: (state)=>{
          if(obj.origData.host != state.host && !obj.isNew(state) && state.connected){
            obj.informText = gettext(
              'To apply changes to the connection configuration, please disconnect from the server and then reconnect.'
            );
          } else {
            obj.informText = undefined;
          }
        }
      },
      {
        id: 'port', label: gettext('Port'), type: 'int', group: gettext('Connection'),
        mode: ['properties', 'edit', 'create'], min: 1, max: 65535, disabled: obj.isShared,
        depChange: (state)=>{
          if(obj.origData.port != state.port && !obj.isNew(state) && state.connected){
            obj.informText = gettext(
              'To apply changes to the connection configuration, please disconnect from the server and then reconnect.'
            );
          } else {
            obj.informText = undefined;
          }
        }
      },{
        id: 'db', label: gettext('Maintenance database'), type: 'text', group: gettext('Connection'),
        mode: ['properties', 'edit', 'create'], readonly: obj.isConnected, disabled: obj.isShared,
        noEmpty: true,
      },{
        id: 'username', label: gettext('Username'), type: 'text', group: gettext('Connection'),
        mode: ['properties', 'edit', 'create'],
        depChange: (state)=>{
          if(obj.origData.username != state.username && !obj.isNew(state) && state.connected){
            obj.informText = gettext(
              'To apply changes to the connection configuration, please disconnect from the server and then reconnect.'
            );
          } else {
            obj.informText = undefined;
          }
        }
      },{
        id: 'kerberos_conn', label: gettext('Kerberos authentication?'), type: 'switch',
        group: gettext('Connection'),
      },{
        id: 'gss_authenticated', label: gettext('GSS authenticated?'), type: 'switch',
        group: gettext('Connection'), mode: ['properties'], visible: obj.isConnected,
      },{
        id: 'gss_encrypted', label: gettext('GSS encrypted?'), type: 'switch',
        group: gettext('Connection'), mode: ['properties'], visible: obj.isConnected,
      },{
        id: 'password', label: gettext('Password'), type: 'password',
        group: gettext('Connection'),
        mode: ['create'],
        deps: ['connect_now', 'kerberos_conn'],
        visible: function(state) {
          return state.connect_now && obj.isNew(state);
        },
        controlProps: {
          maxLength: null
        },
        disabled: function(state) {return state.kerberos_conn;},
      },{
        id: 'save_password', label: gettext('Save password?'),
        type: 'switch', group: gettext('Connection'), mode: ['create'],
        deps: ['connect_now', 'kerberos_conn'],
        visible: function(state) {
          return state.connect_now && obj.isNew(state);
        },
        disabled: function(state) {
          return !current_user.allow_save_password || state.kerberos_conn;
        },
      },{
        id: 'role', label: gettext('Role'), type: 'text', group: gettext('Connection'),
        mode: ['properties', 'edit', 'create'], readonly: obj.isConnected,
      },{
        id: 'service', label: gettext('Service'), type: 'text',
        mode: ['properties', 'edit', 'create'], readonly: obj.isConnected,
        group: gettext('Connection'),
      },
      {
        id: 'sslmode', label: gettext('SSL mode'), type: 'select', group: gettext('SSL'),
        controlProps: {
          allowClear: false,
        },
        mode: ['properties', 'edit', 'create'], disabled: obj.isConnected,
        options: [
          {label: gettext('Allow'), value: 'allow'},
          {label: gettext('Prefer'), value: 'prefer'},
          {label: gettext('Require'), value: 'require'},
          {label: gettext('Disable'), value: 'disable'},
          {label: gettext('Verify-CA'), value: 'verify-ca'},
          {label: gettext('Verify-Full'), value: 'verify-full'},
        ],
      },
      {
        id: 'sslcert', label: gettext('Client certificate'), type: 'file',
        group: gettext('SSL'), mode: ['edit', 'create'],
        disabled: obj.isSSL, readonly: obj.isConnected,
        controlProps: {
          dialogType: 'select_file', supportedTypes: ['*'],
        },
        deps: ['sslmode'],
      },
      {
        id: 'sslkey', label: gettext('Client certificate key'), type: 'file',
        group: gettext('SSL'), mode: ['edit', 'create'],
        disabled: obj.isSSL, readonly: obj.isConnected,
        controlProps: {
          dialogType: 'select_file', supportedTypes: ['*'],
        },
        deps: ['sslmode'],
      },{
        id: 'sslrootcert', label: gettext('Root certificate'), type: 'file',
        group: gettext('SSL'), mode: ['edit', 'create'],
        disabled: obj.isSSL, readonly: obj.isConnected,
        controlProps: {
          dialogType: 'select_file', supportedTypes: ['*'],
        },
        deps: ['sslmode'],
      },{
        id: 'sslcrl', label: gettext('Certificate revocation list'), type: 'file',
        group: gettext('SSL'), mode: ['edit', 'create'],
        disabled: obj.isSSL, readonly: obj.isConnected,
        controlProps: {
          dialogType: 'select_file', supportedTypes: ['*'],
        },
        deps: ['sslmode'],
      },
      {
        id: 'sslcompression', label: gettext('SSL compression?'), type: 'switch',
        mode: ['edit', 'create'], group: gettext('SSL'),
        disabled: obj.isSSL, readonly: obj.isConnected,
        deps: ['sslmode'],
      },
      {
        id: 'sslcert', label: gettext('Client certificate'), type: 'text',
        group: gettext('SSL'), mode: ['properties'],
        deps: ['sslmode'],
        visible: function(state) {
          let sslcert = state.sslcert;
          return !_.isUndefined(sslcert) && !_.isNull(sslcert);
        },
      },{
        id: 'sslkey', label: gettext('Client certificate key'), type: 'text',
        group: gettext('SSL'), mode: ['properties'],
        deps: ['sslmode'],
        visible: function(state) {
          let sslkey = state.sslkey;
          return !_.isUndefined(sslkey) && !_.isNull(sslkey);
        },
      },{
        id: 'sslrootcert', label: gettext('Root certificate'), type: 'text',
        group: gettext('SSL'), mode: ['properties'],
        deps: ['sslmode'],
        visible: function(state) {
          let sslrootcert = state.sslrootcert;
          return !_.isUndefined(sslrootcert) && !_.isNull(sslrootcert);
        },
      },{
        id: 'sslcrl', label: gettext('Certificate revocation list'), type: 'text',
        group: gettext('SSL'), mode: ['properties'],
        deps: ['sslmode'],
        visible: function(state) {
          let sslcrl = state.sslcrl;
          return !_.isUndefined(sslcrl) && !_.isNull(sslcrl);
        },
      },{
        id: 'sslcompression', label: gettext('SSL compression?'), type: 'switch',
        mode: ['properties'], group: gettext('SSL'),
        deps: ['sslmode'],
        visible: function(state) {
          return _.indexOf(obj.SSL_MODES, state.sslmode) != -1;
        },
      },
      {
        id: 'use_ssh_tunnel', label: gettext('Use SSH tunneling'), type: 'switch',
        mode: ['properties', 'edit', 'create'], group: gettext('SSH Tunnel'),
        disabled: function() {
          return !pgAdmin.Browser.utils.support_ssh_tunnel;
        },
        readonly: obj.isConnected,
      },{
        id: 'tunnel_host', label: gettext('Tunnel host'), type: 'text', group: gettext('SSH Tunnel'),
        mode: ['properties', 'edit', 'create'], deps: ['use_ssh_tunnel'],
        disabled: function(state) {
          return !state.use_ssh_tunnel;
        },
        readonly: obj.isConnected,
      },{
        id: 'tunnel_port', label: gettext('Tunnel port'), type: 'int', group: gettext('SSH Tunnel'),
        mode: ['properties', 'edit', 'create'], deps: ['use_ssh_tunnel'], max: 65535,
        disabled: function(state) {
          return !state.use_ssh_tunnel;
        },
        readonly: obj.isConnected,
      },{
        id: 'tunnel_username', label: gettext('Username'), type: 'text', group: gettext('SSH Tunnel'),
        mode: ['properties', 'edit', 'create'], deps: ['use_ssh_tunnel'],
        disabled: function(state) {
          return !state.use_ssh_tunnel;
        },
        readonly: obj.isConnected,
      },{
        id: 'tunnel_authentication', label: gettext('Authentication'), type: 'toggle',
        mode: ['properties', 'edit', 'create'], group: gettext('SSH Tunnel'),
        options: [
          {'label': gettext('Password'), value: false},
          {'label': gettext('Identity file'), value: true},
        ],
        disabled: function(state) {
          return !state.use_ssh_tunnel;
        },
        readonly: obj.isConnected,
      },
      {
        id: 'tunnel_identity_file', label: gettext('Identity file'), type: 'file',
        group: gettext('SSH Tunnel'), mode: ['properties', 'edit', 'create'],
        controlProps: {
          dialogType: 'select_file', supportedTypes: ['*'],
        },
        deps: ['tunnel_authentication', 'use_ssh_tunnel'],
        depChange: (state)=>{
          if (!state.tunnel_authentication && state.tunnel_identity_file) {
            return {tunnel_identity_file: null};
          }
        },
        disabled: function(state) {
          return !state.tunnel_authentication || !state.use_ssh_tunnel;
        },
      },
      {
        id: 'tunnel_password', label: gettext('Password'), type: 'password',
        group: gettext('SSH Tunnel'), mode: ['create'],
        deps: ['use_ssh_tunnel'],
        disabled: function(state) {
          return !state.use_ssh_tunnel;
        },
        controlProps: {
          maxLength: null
        },
        readonly: obj.isConnected,
      }, {
        id: 'save_tunnel_password', label: gettext('Save password?'),
        type: 'switch', group: gettext('SSH Tunnel'), mode: ['create'],
        deps: ['connect_now', 'use_ssh_tunnel'],
        visible: function(state) {
          return state.connect_now && obj.isNew(state);
        },
        disabled: function(state) {
          return (!current_user.allow_save_tunnel_password || !state.use_ssh_tunnel);
        },
      }, {
        id: 'hostaddr', label: gettext('Host address'), type: 'text', group: gettext('Advanced'),
        mode: ['properties', 'edit', 'create'], readonly: obj.isConnected,
      },
      {
        id: 'db_res', label: gettext('DB restriction'), type: 'select', group: gettext('Advanced'),
        options: [],
        mode: ['properties', 'edit', 'create'], readonly: obj.isConnected, controlProps: {
          multiple: true, allowClear: false, creatable: true, noDropdown: true, placeholder: 'Specify the databases to be restrict...'},
      },
      {
        id: 'passfile', label: gettext('Password file'), type: 'file',
        group: gettext('Advanced'), mode: ['edit', 'create'],
        disabled: obj.isValidLib, readonly: obj.isConnected,
        controlProps: {
          dialogType: 'select_file', supportedTypes: ['*'],
        },
      },
      {
        id: 'passfile', label: gettext('Password file'), type: 'text',
        group: gettext('Advanced'), mode: ['properties'],
        visible: function(state) {
          let passfile = state.passfile;
          return !_.isUndefined(passfile) && !_.isNull(passfile);
        },
      },
      {
        id: 'passexec_cmd', label: gettext('Password exec command'), type: 'text',
        group: gettext('Advanced'),
        mode: ['properties', 'edit', 'create'],
      },
      {
        id: 'passexec_expiration', label: gettext('Password exec expiration (seconds)'), type: 'int',
        group: gettext('Advanced'),
        mode: ['properties', 'edit', 'create'],
        visible: function(state) {
          return !_.isEmpty(state.passexec_cmd);
        },
      },
      {
        id: 'connect_timeout', label: gettext('Connection timeout (seconds)'),
        type: 'int', group: gettext('Advanced'),
        mode: ['properties', 'edit', 'create'], readonly: obj.isConnected,
        min: 0,
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null;

    if (isEmptyString(state.service)) {
      errmsg = gettext('Either Host name, Address or Service must be specified.');
      if(isEmptyString(state.host) && isEmptyString(state.hostaddr)) {
        setError('host', errmsg);
        return true;
      } else {
        setError('host', null);
        setError('hostaddr', null);
      }

      /* IP address validate */
      if (state.hostaddr) {
        try {
          new Address4(state.hostaddr);
        } catch(e) {
          try {
            new Address6(state.hostaddr);
          } catch(ex) {
            errmsg = gettext('Host address must be valid IPv4 or IPv6 address.');
            setError('hostaddr', errmsg);
            return true;
          }
        }
      } else {
        setError('hostaddr', null);
      }

      /* Hostname, IP address validate */
      if (state.host) {
        // Check for leading and trailing spaces.
        if (/(^\s)|(\s$)/.test(state.host)){
          errmsg = gettext('Host name must be valid hostname or IPv4 or IPv6 address.');
          setError('host', errmsg);
          return true;
        } else {
          setError('host', null);
        }
      }

      if(isEmptyString(state.username)) {
        errmsg = gettext('Username must be specified.');
        setError('username', errmsg);
        return true;
      } else {
        setError('username', null);
      }

      if(isEmptyString(state.port)) {
        errmsg = gettext('Port must be specified.');
        setError('port', errmsg);
        return true;
      } else {
        setError('port', null);
      }
    } else {
      _.each(['host', 'hostaddr', 'db', 'username', 'port'], (item) => {
        setError(item, null);
      });
    }

    if (state.use_ssh_tunnel) {
      if(isEmptyString(state.tunnel_host)) {
        errmsg = gettext('SSH Tunnel host must be specified.');
        setError('tunnel_host', errmsg);
        return true;
      } else {
        setError('tunnel_host', null);
      }

      if(isEmptyString(state.tunnel_port)) {
        errmsg = gettext('SSH Tunnel port must be specified.');
        setError('tunnel_port', errmsg);
        return true;
      } else {
        setError('tunnel_port', null);
      }

      if(isEmptyString(state.tunnel_username)) {
        errmsg = gettext('SSH Tunnel username must be specified.');
        setError('tunnel_username', errmsg);
        return true;
      } else {
        setError('tunnel_username', null);
      }

      if (state.tunnel_authentication) {
        if(isEmptyString(state.tunnel_identity_file)) {
          errmsg = gettext('SSH Tunnel identity file must be specified.');
          setError('tunnel_identity_file', errmsg);
          return true;
        } else {
          setError('tunnel_identity_file', null);
        }
      }
    }
    return false;
  }
}
