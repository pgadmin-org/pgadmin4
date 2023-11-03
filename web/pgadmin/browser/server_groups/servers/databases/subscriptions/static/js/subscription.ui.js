/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { isEmptyString } from 'sources/validators';
import _ from 'lodash';

export default class SubscriptionSchema extends BaseUISchema{
  constructor(fieldOptions={}, node_info={}, initValues={}) {
    super({
      name: undefined,
      subowner: undefined,
      pubtable: undefined,
      connect_timeout: 10,
      pub:[],
      enabled:true,
      create_slot: true,
      copy_data:true,
      connect:true,
      binary:false,
      two_phase:false,
      disable_on_error:false,
      streaming:false,
      password_required:true,
      run_as_owner:false,
      origin:'any',
      copy_data_after_refresh:false,
      sync:'off',
      refresh_pub: false,
      password: '',
      sslmode: 'prefer',
      sslcompression: false,
      sslcert: '',
      sslkey: '',
      sslrootcert: '',
      sslcrl: '',
      host: '',
      port: 5432,
      db: 'postgres',
      ...initValues,
    });

    this.fieldOptions = {
      role: [],
      publicationTable: [],
      ...fieldOptions,
    };
    this.node_info = node_info;
    this.version=!_.isUndefined(this.node_info['node_info']) && !_.isUndefined(this.node_info['node_info'].version) && this.node_info['node_info'].version;

  }
  get idAttribute() {
    return 'oid';
  }

  get SSL_MODES() { return ['prefer', 'require', 'verify-ca', 'verify-full']; }

  isDisable(){
    return !this.isNew();
  }
  isSameDB(state){
    let host = state.host,
      port = state.port;

    if ((state.host == 'localhost' || state.host == '127.0.0.1') &&
            (this.node_info['node_info'].host == 'localhost' || this.node_info['node_info'].host == '127.0.0.1')){
      host = this.node_info['node_info'].host;
    }
    if (host == this.node_info['node_info'].host && port == this.node_info['node_info'].port){
      state.create_slot = false;
      return true;
    } else {
      state.create_slot = true;
    }
    return false;
  }
  isAllConnectionDataEnter(state){
    let host = state.host,
      db   = state.db,
      port = state.port,
      username = state.username;
    return !((!_.isUndefined(host) && host) && (!_.isUndefined(db) && db) && (!_.isUndefined(port) && port) && (!_.isUndefined(username) && username));
  }
  isConnect(state){
    if(!_.isUndefined(state.connect) && !state.connect){
      state.copy_data = false;
      state.create_slot = false;
      state.enabled  = false;
      return true;
    }
    return false;
  }
  isRefresh(state){
    if (!state.refresh_pub || _.isUndefined(state.refresh_pub)){
      return true;
    }
    return false;
  }
  isSSL(state) {
    return this.SSL_MODES.indexOf(state.sslmode) == -1;
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'name', label: gettext('Name'), type: 'text',
      mode: ['properties', 'create', 'edit'], noEmpty: true,
      min_version: 100000
    },{
      id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
      type: 'text',
    },
    {
      id: 'subowner', label: gettext('Owner'),
      options: this.fieldOptions.role,
      type: 'select',
      mode: ['edit', 'properties', 'create'], controlProps: { allowClear: false},
      disabled: function(){
        return obj.isNew();
      },
    },{
      id: 'host', label: gettext('Host name/address'), type: 'text', group: gettext('Connection'),
      mode: ['properties', 'edit', 'create'],
    },
    {
      id: 'port', label: gettext('Port'), type: 'int', group: gettext('Connection'),
      mode: ['properties', 'edit', 'create'], min: 1, max: 65535,
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
      id: 'db', label: gettext('Database'), type: 'text', group: gettext('Connection'),
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
    },
    {
      id: 'password', label: gettext('Password'), type: 'password',
      controlProps: { maxLength: null},
      group: gettext('Connection'),
      mode: ['create', 'edit'], skipChange: true,
      deps: ['connect_now'],
    },
    {
      id: 'connect_timeout', label: gettext('Connection timeout'), type: 'text',
      mode: ['properties', 'edit', 'create'],
      group: gettext('Connection'),
    },
    {
      id: 'passfile', label: gettext('Passfile'), type: 'text', group: gettext('Connection'),
      mode: ['properties', 'edit', 'create'],
    },
    {
      id: 'proppub', label: gettext('Publication'), type: 'text', group: gettext('Connection'),
      mode: ['properties'],
    },
    {
      id: 'pub', label: gettext('Publication'),
      group: gettext('Connection'), mode: ['create', 'edit'],
      deps: ['all_table', 'host', 'port', 'username', 'db', 'password'], disabled: obj.isAllConnectionDataEnter,
      helpMessage: gettext('Click the refresh button to get the publications'),
      helpMessageMode: ['edit', 'create'],
      type: (state)=>{
        return {
          type: 'select-refresh',
          controlProps: { allowClear: true, multiple: true, creatable: true, getOptionsOnRefresh: ()=>{
            return obj.fieldOptions.getPublication(state.host, state.password, state.port, state.username, state.db,
              state.connect_timeout, state.passfile, state.sslmode,
              state.sslcompression, state.sslcert, state.sslkey,
              state.sslrootcert, state.sslcrl);
          }},
        };
      },
    },

    {
      id: 'sslmode', label: gettext('SSL mode'), type: 'select', group: gettext('SSL'),
      controlProps: {
        allowClear: false,
      },
      mode: ['properties', 'edit', 'create'],
      options: [
        {label: gettext('Allow'), value: 'allow'},
        {label: gettext('Prefer'), value: 'prefer'},
        {label: gettext('Require'), value: 'require'},
        {label: gettext('Disable'), value: 'disable'},
        {label: gettext('Verify-CA'), value: 'verify-ca'},
        {label: gettext('Verify-Full'), value: 'verify-full'},
      ],
    },{
      id: 'sslcert', label: gettext('Client certificate'), type: 'file',
      group: gettext('SSL'), mode: ['edit', 'create'],
      disabled: obj.isSSL,
      controlProps: {
        dialogType: 'select_file', supportedTypes: ['*'],
      },
      deps: ['sslmode'],
    },
    {
      id: 'sslkey', label: gettext('Client certificate key'), type: 'file',
      group: gettext('SSL'), mode: ['edit', 'create'],
      disabled: obj.isSSL,
      controlProps: {
        dialogType: 'select_file', supportedTypes: ['*'],
      },
      deps: ['sslmode'],
    },{
      id: 'sslrootcert', label: gettext('Root certificate'), type: 'file',
      group: gettext('SSL'), mode: ['edit', 'create'],
      disabled: obj.isSSL,
      controlProps: {
        dialogType: 'select_file', supportedTypes: ['*'],
      },
      deps: ['sslmode'],
    },{
      id: 'sslcrl', label: gettext('Certificate revocation list'), type: 'file',
      group: gettext('SSL'), mode: ['edit', 'create'],
      disabled: obj.isSSL,
      controlProps: {
        dialogType: 'select_file', supportedTypes: ['*'],
      },
      deps: ['sslmode'],
    },
    {
      id: 'sslcompression', label: gettext('SSL compression?'), type: 'switch',
      mode: ['edit', 'create'], group: gettext('SSL'),
      disabled: obj.isSSL,
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
      id: 'copy_data_after_refresh', label: gettext('Copy data?'),
      type: 'switch', mode: ['edit'],
      group: gettext('With'),
      readonly: obj.isRefresh, deps :['refresh_pub'],
      helpMessage: gettext('Specifies whether the existing data in the publications that are being subscribed to should be copied once the replication starts.'),
      helpMessageMode: ['edit', 'create'],
    },
    {
      id: 'copy_data', label: gettext('Copy data?'),
      type: 'switch', mode: ['create'],
      group: gettext('With'),
      readonly: obj.isConnect, deps :['connect'],
      helpMessage: gettext('Specifies whether the existing data in the publications that are being subscribed to should be copied once the replication starts.'),
      helpMessageMode: ['edit', 'create'],
    },
    {
      id: 'create_slot', label: gettext('Create slot?'),
      type: 'switch', mode: ['create'],
      group: gettext('With'),
      disabled: obj.isSameDB,
      readonly: obj.isConnect, deps :['connect', 'host', 'port'],
      helpMessage: gettext('Specifies whether the command should create the replication slot on the publisher.This field will be disabled and set to false if subscription connects to same database.Otherwise, the CREATE SUBSCRIPTION call will hang.'),
      helpMessageMode: ['edit', 'create'],
    },
    {
      id: 'enabled', label: gettext('Enabled?'),
      type: 'switch', mode: ['create','edit', 'properties'],
      group: gettext('With'),
      readonly: obj.isConnect, deps :['connect'],
      helpMessage: gettext('Specifies whether the subscription should be actively replicating, or whether it should be just setup but not started yet.'),
      helpMessageMode: ['edit', 'create'],
    },
    {
      id: 'refresh_pub', label: gettext('Refresh publication?'),
      type: 'switch', mode: ['edit'],
      group: gettext('With'),
      helpMessage: gettext('Fetch missing table information from publisher.'),
      helpMessageMode: ['edit', 'create'],
      deps:['enabled'], disabled: function(state){
        if (state.enabled)
          return false;
        state.refresh_pub = false;
        state.copy_data_after_refresh = false;
        return true;
      }, depChange: (state)=>{
        state.copy_data_after_refresh = state.refresh_pub ? state.copy_data_after_refresh ? false : true : false;
      },
    },{
      id: 'connect', label: gettext('Connect?'),
      type: 'switch', mode: ['create'],
      group: gettext('With'),
      disabled: obj.isDisable, deps:['enabled', 'create_slot', 'copy_data'],
      helpMessage: gettext('Specifies whether the CREATE SUBSCRIPTION should connect to the publisher at all. Setting this to false will change default values of enabled, create_slot and copy_data to false.'),
      helpMessageMode: ['edit', 'create'],
    },
    {
      id: 'slot_name', label: gettext('Slot name'),
      type: 'text', mode: ['create','edit', 'properties'],
      group: gettext('With'),
      helpMessage: gettext('Name of the replication slot to use. The default behavior is to use the name of the subscription for the slot name.'),
      helpMessageMode: ['edit', 'create'],
    },
    {
      id: 'sync', label: gettext('Synchronous commit'), control: 'select2', deps:['event'],
      group: gettext('With'), type: 'select',
      helpMessage: gettext('The value of this parameter overrides the synchronous_commit setting. The default value is off.'),
      helpMessageMode: ['edit', 'create'],
      controlProps: {
        width: '100%',
        allowClear: false,
      },
      options:[
        {label: 'local', value: 'local'},
        {label: 'remote_write', value: 'remote_write'},
        {label: 'remote_apply', value: 'remote_apply'},
        {label: 'on', value: 'on'},
        {label: 'off', value: 'off'},
      ],
    },
    {
      id: 'streaming',
      label: gettext('Streaming'),
      cell: 'text',
      group: gettext('With'), mode: ['create', 'edit', 'properties'],
      type: ()=>{
        let options = [
          {
            'label': gettext('On'),
            value: true,
          },
          {
            'label': gettext('Off'),
            value: false,
          }
        ];

        if (obj.version >= 160000) {
          options.push({
            'label': gettext('Parallel'),
            value: 'parallel',
          });
        }

        return {
          type: 'toggle',
          options: options,
        };
      },
      min_version: 140000,
      helpMessage: gettext('Specifies whether to enable streaming of in-progress transactions for this subscription. By default, all transactions are fully decoded on the publisher and only then sent to the subscriber as a whole.'),
      helpMessageMode: ['edit', 'create'],
    },
    {
      id: 'binary', label: gettext('Binary?'),
      type: 'switch', mode: ['create', 'edit', 'properties'],
      group: gettext('With'),
      min_version: 140000,
      helpMessage: gettext('Specifies whether the subscription will request the publisher to send the data in binary format (as opposed to text). Even when this option is enabled, only data types having binary send and receive functions will be transferred in binary.'),
      helpMessageMode: ['edit', 'create'],
    },
    {
      id: 'two_phase', label: gettext('Two phase?'),
      type: 'switch', mode: ['create', 'properties'],
      group: gettext('With'),
      min_version: 150000,
      helpMessage: gettext('Specifies whether two-phase commit is enabled for this subscription.'),
      helpMessageMode: ['edit', 'create'],
    },
    {
      id: 'disable_on_error', label: gettext('Disable on error?'),
      type: 'switch', mode: ['create', 'edit', 'properties'],
      group: gettext('With'),
      min_version: 150000,
      helpMessage: gettext('Specifies whether the subscription should be automatically disabled if any errors are detected by subscription workers during data replication from the publisher.'),
      helpMessageMode: ['edit', 'create'],
    },
    {
      id: 'run_as_owner', label: gettext('Run as owner?'),
      type: 'switch', mode: ['create', 'properties'],
      group: gettext('With'),
      min_version: 160000,
      helpMessage: gettext('If true, all replication actions are performed as the subscription owner. If false, replication workers will perform actions on each table as the owner of that table.'),
      helpMessageMode: ['edit', 'create'],
    },
    {
      id: 'password_required', label: gettext('Password required?'),
      type: 'switch', mode: ['create', 'edit', 'properties'],
      group: gettext('With'),
      min_version: 160000,
      helpMessage: gettext('Specifies whether connections to the publisher made as a result of this subscription must use password authentication. Only superusers can set this value to false.'),
      helpMessageMode: ['edit', 'create'],
    },
    {
      id: 'origin', label: gettext('Origin'),
      type: 'select', mode: ['create', 'edit', 'properties'],
      group: gettext('With'),
      controlProps: {
        allowClear: false,
      },
      options: [
        {label: gettext('none'), value: 'none'},
        {label: gettext('any'), value: 'any'},
      ],
      min_version: 160000,
      helpMessage: gettext('Specifies whether the subscription will request the publisher to only send changes that do not have an origin or send changes regardless of origin. Setting origin to none means that the subscription will request the publisher to only send changes that do not have an origin. Setting origin to any means that the publisher sends changes regardless of their origin.'),
      helpMessageMode: ['edit', 'create'],
    },
    ];
  }

  validate(state, setError) {
    let errmsg = null;
    errmsg = gettext('Either Host name, Address must be specified.');
    if(isEmptyString(state.host)) {
      setError('host', errmsg);
      return true;
    } else {
      setError('host', null);
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

    if(isEmptyString(state.pub)) {
      errmsg = gettext('Publication must be specified.');
      setError('pub', errmsg);
      return true;
    } else {
      setError('pub', null);
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
