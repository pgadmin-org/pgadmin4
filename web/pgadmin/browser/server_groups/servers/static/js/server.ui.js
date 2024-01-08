/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import _ from 'lodash';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import pgAdmin from 'sources/pgadmin';
import {default as supportedServers} from 'pgadmin.server.supported_servers';
import current_user from 'pgadmin.user_management.current_user';
import { isEmptyString } from 'sources/validators';
import VariableSchema from './variable.ui';

export default class ServerSchema extends BaseUISchema {
  constructor(serverGroupOptions=[], userId=0, initValues={}) {
    super({
      gid: undefined,
      id: undefined,
      name: '',
      bgcolor: '',
      fgcolor: '',
      host: '',
      port: 5432,
      db: 'postgres',
      username: current_user.name,
      role: null,
      connect_now: true,
      password: undefined,
      save_password: false,
      db_res: [],
      passexec: undefined,
      passexec_expiration: undefined,
      service: undefined,
      shared_username: '',
      use_ssh_tunnel: false,
      tunnel_host: undefined,
      tunnel_port: 22,
      tunnel_username: undefined,
      tunnel_identity_file: undefined,
      tunnel_password: undefined,
      tunnel_authentication: false,
      tunnel_keep_alive: 0,
      save_tunnel_password: false,
      connection_string: undefined,
      connection_params: [
        {'name': 'sslmode', 'value': 'prefer', 'keyword': 'sslmode'},
        {'name': 'connect_timeout', 'value': 10, 'keyword': 'connect_timeout'}],
      ...initValues,
    });

    this.serverGroupOptions = serverGroupOptions;
    this.paramSchema = new VariableSchema(this.getConnectionParameters(), null, null, ['name', 'keyword', 'value']);
    this.userId = userId;
    _.bindAll(this, 'isShared');
  }

  initialise(state) {
    this.paramSchema.setAllReadOnly(this.isConnected(state));
  }

  isShared(state) {
    return !this.isNew(state) && this.userId != current_user.id && state.shared;
  }

  isConnected(state) {
    return Boolean(state.connected);
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
        id: 'shared_username', label: gettext('Shared Username'), type: 'text',
        controlProps: { maxLength: 64},
        mode: ['properties', 'create', 'edit'], deps: ['shared', 'username'],
        readonly: (s)=>{
          return !(!this.origData.shared && s.shared);
        }, visible: ()=>{
          return current_user.is_admin && pgAdmin.server_mode == 'True';
        },
        depChange: (state, source, _topState, actionObj)=>{
          let ret = {};
          if(this.origData.shared) {
            return ret;
          }
          if(source == 'username' && actionObj.oldState.username == state.shared_username) {
            ret['shared_username'] = state.username;
          }
          if(source == 'shared') {
            if(state.shared) {
              ret['shared_username'] = state.username;
            } else {
              ret['shared_username'] = '';
            }
          }
          return ret;
        },
      },
      {
        id: 'comment', label: gettext('Comments'), type: 'multiline', group: null,
        mode: ['properties', 'edit', 'create'],
      }, {
        id: 'connection_string', label: gettext('Connection String'), type: 'multiline',
        group: gettext('Connection'), mode: ['properties'], readonly: true,
      }, {
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
      }, {
        id: 'connection_params', label: gettext('Connection Parameters'),
        type: 'collection', group: gettext('Parameters'),
        schema: this.paramSchema, mode: ['edit', 'create'], uniqueCol: ['name'],
        canAdd: (state)=> !obj.isConnected(state), canEdit: false,
        canDelete: (state)=> !obj.isConnected(state),
      }, {
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
      },
      {
        id: 'tunnel_keep_alive', label: gettext('Keep alive (seconds)'),
        type: 'int', group: gettext('SSH Tunnel'), min: 0,
        mode: ['properties', 'edit', 'create'], deps: ['use_ssh_tunnel'],
        disabled: function(state) {
          return !state.use_ssh_tunnel;
        },
        readonly: obj.isConnected,
      },
      {
        id: 'db_res', label: gettext('DB restriction'), type: 'select', group: gettext('Advanced'),
        options: [],
        mode: ['properties', 'edit', 'create'], readonly: obj.isConnected, controlProps: {
          multiple: true, allowClear: false, creatable: true, noDropdown: true, placeholder: 'Specify the databases to be restrict...'},
      },
      {
        id: 'passexec_cmd', label: gettext('Password exec command'), type: 'text',
        group: gettext('Advanced'), controlProps: {maxLength: null},
        mode: ['properties', 'edit', 'create'],
        disabled: pgAdmin.server_mode == 'True',
      },
      {
        id: 'passexec_expiration', label: gettext('Password exec expiration (seconds)'), type: 'int',
        group: gettext('Advanced'),
        mode: ['properties', 'edit', 'create'],
        disabled: function(state) {
          return isEmptyString(state.passexec_cmd);
        },
      },
      {
        id: 'prepare_threshold', label: gettext('Prepare threshold'), type: 'int',
        group: gettext('Advanced'),
        mode: ['properties', 'edit', 'create'],
        helpMessageMode: ['edit', 'create'],
        helpMessage: gettext('If it is set to 0, every query is prepared the first time it is executed. If it is set to blank, prepared statements are disabled on the connection.')
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null;

    if(isEmptyString(state.gid)) {
      errmsg = gettext('Server group must be specified.');
      setError('gid', errmsg);
      return true;
    } else {
      setError('gid', null);
    }

    if (isEmptyString(state.service)) {
      errmsg = gettext('Either Host name or Service must be specified.');
      if(isEmptyString(state.host)) {
        setError('host', errmsg);
        return true;
      } else {
        setError('host', null);
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
      _.each(['host', 'db', 'username', 'port'], (item) => {
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

      if(isEmptyString(state.tunnel_keep_alive)) {
        errmsg = gettext('Keep alive must be specified. Specify 0 for no keep alive.');
        setError('tunnel_keep_alive', errmsg);
        return true;
      } else {
        setError('tunnel_keep_alive', null);
      }
    }
    return false;
  }

  getConnectionParameters() {
    return [{
      'value': 'hostaddr', 'label': gettext('Host address'), 'vartype': 'string'
    }, {
      'value': 'passfile', 'label': gettext('Password file'), 'vartype': 'file'
    }, {
      'value': 'channel_binding', 'label': gettext('Channel binding'), 'vartype': 'enum',
      'enumvals': [gettext('prefer'), gettext('require'), gettext('disable')],
      'min_server_version': '13'
    }, {
      'value': 'connect_timeout', 'label': gettext('Connection timeout (seconds)'), 'vartype': 'integer'
    }, {
      'value': 'client_encoding', 'label': gettext('Client encoding'), 'vartype': 'string'
    },  {
      'value': 'options', 'label': gettext('Options'), 'vartype': 'string'
    }, {
      'value': 'application_name', 'label': gettext('Application name'), 'vartype': 'string'
    }, {
      'value': 'fallback_application_name', 'label': gettext('Fallback application name'), 'vartype': 'string'
    }, {
      'value': 'keepalives', 'label': gettext('Keepalives'), 'vartype': 'integer'
    }, {
      'value': 'keepalives_idle', 'label': gettext('Keepalives idle (seconds)'), 'vartype': 'integer'
    }, {
      'value': 'keepalives_interval', 'label': gettext('Keepalives interval (seconds)'), 'vartype': 'integer'
    }, {
      'value': 'keepalives_count', 'label': gettext('Keepalives count'), 'vartype': 'integer'
    }, {
      'value': 'tcp_user_timeout', 'label': gettext('TCP user timeout (milliseconds)'), 'vartype': 'integer',
      'min_server_version': '12'
    },  {
      'value': 'tty', 'label': gettext('TTY'), 'vartype': 'string',
      'max_server_version': '13'
    }, {
      'value': 'replication', 'label': gettext('Replication'), 'vartype': 'enum',
      'enumvals': [gettext('on'), gettext('off'), gettext('database')],
      'min_server_version': '11'
    }, {
      'value': 'gssencmode', 'label': gettext('GSS encmode'), 'vartype': 'enum',
      'enumvals': [gettext('prefer'), gettext('require'), gettext('disable')],
      'min_server_version': '12'
    }, {
      'value': 'sslmode', 'label': gettext('SSL mode'), 'vartype': 'enum',
      'enumvals': [gettext('allow'), gettext('prefer'), gettext('require'),
        gettext('disable'), gettext('verify-ca'), gettext('verify-full')]
    }, {
      'value': 'sslcompression', 'label': gettext('SSL compression?'), 'vartype': 'bool',
    }, {
      'value': 'sslcert', 'label': gettext('Client certificate'), 'vartype': 'file'
    }, {
      'value': 'sslkey', 'label': gettext('Client certificate key'), 'vartype': 'file'
    }, {
      'value': 'sslpassword', 'label': gettext('SSL password'), 'vartype': 'string',
      'min_server_version': '13'
    }, {
      'value': 'sslrootcert', 'label': gettext('Root certificate'), 'vartype': 'file'
    }, {
      'value': 'sslcrl', 'label': gettext('Certificate revocation list'), 'vartype': 'file',
    }, {
      'value': 'sslcrldir', 'label': gettext('Certificate revocation list directory'), 'vartype': 'file',
      'min_server_version': '14'
    }, {
      'value': 'sslsni', 'label': gettext('Server name indication'), 'vartype': 'bool',
      'min_server_version': '14'
    }, {
      'value': 'requirepeer', 'label': gettext('Require peer'), 'vartype': 'string',
    }, {
      'value': 'ssl_min_protocol_version', 'label': gettext('SSL min protocol version'),
      'vartype': 'enum', 'min_server_version': '13',
      'enumvals': [gettext('TLSv1'), gettext('TLSv1.1'), gettext('TLSv1.2'),
        gettext('TLSv1.3')]
    }, {
      'value': 'ssl_max_protocol_version', 'label': gettext('SSL max protocol version'),
      'vartype': 'enum', 'min_server_version': '13',
      'enumvals': [gettext('TLSv1'), gettext('TLSv1.1'), gettext('TLSv1.2'),
        gettext('TLSv1.3')]
    }, {
      'value': 'krbsrvname', 'label': gettext('Kerberos service name'), 'vartype': 'string',
    }, {
      'value': 'gsslib', 'label': gettext('GSS library'), 'vartype': 'string',
    }, {
      'value': 'target_session_attrs', 'label': gettext('Target session attribute'),
      'vartype': 'enum',
      'enumvals': [gettext('any'), gettext('read-write'), gettext('read-only'),
        gettext('primary'), gettext('standby'), gettext('prefer-standby')]
    }, {
      'value': 'load_balance_hosts', 'label': gettext('Load balance hosts'),
      'vartype': 'enum', 'min_server_version': '16',
      'enumvals': [gettext('disable'), gettext('random')]
    }];
  }
}
