/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.subscription', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'sources/browser/server_groups/servers/model_validation', 'pgadmin.alertifyjs', 'pgadmin.browser.collection',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, Backform, modelValidation, Alertify) {
  var SSL_MODES = ['prefer', 'require', 'verify-ca', 'verify-full'];

  // Extend the browser's collection class for subscriptions collection
  if (!pgBrowser.Nodes['coll-subscription']) {
    pgBrowser.Nodes['coll-subscription'] =
      pgBrowser.Collection.extend({
        node: 'subscription',
        label: gettext('Subscriptions'),
        type: 'coll-subscription',
        columns: ['name', 'subowner', 'pub', 'enabled'],
        hasStatistics: true,
      });
  }

  // Extend the browser's node class for subscription node
  if (!pgBrowser.Nodes['subscription']) {
    pgBrowser.Nodes['subscription'] = pgBrowser.Node.extend({
      parent_type: 'database',
      type: 'subscription',
      sqlAlterHelp: 'sql-altersubscription.html',
      sqlCreateHelp: 'sql-createsubscription.html',
      dialogHelp: url_for('help.static', {'filename': 'subscription_dialog.html'}),
      label: gettext('Subscription'),
      hasSQL:  true,
      canDrop: true,
      canDropCascade: true,
      hasDepends: true,
      hasStatistics: true,
      width: '501px',
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;


        // Add context menus for subscription
        pgBrowser.add_menus([{
          name: 'create_subscription_on_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Subscription...'),
          icon: 'wcTabIcon icon-subscription', data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].canCreate,
        },{
          name: 'create_subscription_on_coll', node: 'coll-subscription', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Subscription...'),
          icon: 'wcTabIcon icon-subscription', data: {action: 'create'},
          enable: 'canCreate',
        },{
          name: 'create_subscription', node: 'subscription', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Subscription...'),
          icon: 'wcTabIcon icon-subscription', data: {action: 'create'},
          enable: 'canCreate',
        }]);
      },
      // Define the model for subscription node
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,
          subowner: undefined,
          pubtable: undefined,
          connect_timeout: 10,
          pub:[],
          enabled:true,
          create_slot: true,
          copy_data:true,
          connect:true,
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
          hostaddr: '',
          port: 5432,
          db: 'postgres',
        },

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'subowner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Define the schema for the subscription node
        schema: [{
          id: 'name', label: gettext('Name'), type: 'text',
          mode: ['properties', 'create', 'edit'],
          visible: function() {
            if(!_.isUndefined(this.node_info) && !_.isUndefined(this.node_info.server)
              && !_.isUndefined(this.node_info.server.version) &&
                this.node_info.server.version >= 100000) {
              return true;
            }
            return false;
          },
        },{
          id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
          type: 'text',
        },
        {
          id: 'subowner', label: gettext('Owner'), type: 'text',
          control: Backform.NodeListByNameControl, node: 'role',
          mode: ['edit', 'properties', 'create'], select2: { allowClear: false},
          disabled: function(m){
            if(m.isNew())
              return true;
            return false;
          },
        },
        {
          id: 'host', label: gettext('Host name/address'), type: 'text', group: gettext('Connection'),
          mode: ['properties', 'edit', 'create'],
          control: Backform.InputControl.extend({
            onChange: function() {
              Backform.InputControl.prototype.onChange.apply(this, arguments);
              if (!this.model || !this.model.changed) {
                this.model.inform_text = undefined;
                return;
              }
            },
          }),
        },{
          id: 'port', label: gettext('Port'), type: 'int', group: gettext('Connection'),
          mode: ['properties', 'edit', 'create'], min: 1, max: 65535,
          control: Backform.InputControl.extend({
            onChange: function() {
              Backform.InputControl.prototype.onChange.apply(this, arguments);
              if (!this.model || !this.model.changed) {
                this.model.inform_text = undefined;
                return;
              }
            },
          }),
        },{
          id: 'username', label: gettext('Username'), type: 'text', group: gettext('Connection'),
          mode: ['properties', 'edit', 'create'],
          control: Backform.InputControl.extend({
            onChange: function() {
              Backform.InputControl.prototype.onChange.apply(this, arguments);
              if (!this.model || !this.model.changed) {
                this.model.inform_text = undefined;
                return;
              }
            },
          }),
        },{
          id: 'password', label: gettext('Password'), type: 'password', maxlength: null,
          group: gettext('Connection'), control: 'input', mode: ['create', 'edit'], deps: ['connect_now'],
        },{
          id: 'db', label: gettext('Database'), type: 'text', group: gettext('Connection'),
          mode: ['properties', 'edit', 'create'],
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
          id: 'pub', label: gettext('Publication'), type: 'text', group: gettext('Connection'),
          mode: ['properties'],
        },
        {
          id: 'cur_pub', label: gettext('Current publication'), type: 'text', group: gettext('Connection'),
          mode: ['edit'], disabled:true,
        },
        {
          id: 'pub', label: gettext('Publication'), type: 'array', select2: { allowClear: true, multiple: true, width: '92%'},
          group: gettext('Connection'), mode: ['create', 'edit'], controlsClassName: 'pgadmin-controls pg-el-sm-11 pg-el-12',
          deps: ['all_table', 'host', 'port', 'username', 'db', 'password'], disabled: 'isAllConnectionDataEnter',
          helpMessage: gettext('Click the refresh button to get the publications'),
          control: Backform.Select2Control.extend({
            defaults: _.extend(Backform.Select2Control.prototype.defaults, {
              select2: {
                allowClear: true,
                selectOnBlur: true,
                tags: true,
                placeholder: gettext('Select an item...'),
                width: 'style',
              },
            }),
            template: _.template([
              '<label class="<%=Backform.controlLabelClassName%>" for="<%=cId%>"><%=label%></label>',
              '<div class="<%=Backform.controlsClassName%>">',
              '<div class="input-group">',
              ' <select title="<%=name%>" id="<%=cId%>" class="<%=Backform.controlClassName%> <%=extraClasses.join(\' \')%>"',
              '  name="<%=name%>" value="<%-value%>" <%=disabled ? "disabled" : ""%> <%=readonly ? "disabled" : ""%>',
              '  <%=required ? "required" : ""%><%= select2.multiple ? " multiple>" : ">" %>',
              '  <%=select2.first_empty ? " <option></option>" : ""%>',
              '  <% for (var i=0; i < options.length; i++) {%>',
              '   <% var option = options[i]; %>',
              '   <option ',
              '    <% if (option.image) { %> data-image=<%=option.image%> <%}%>',
              '    value=<%- formatter.fromRaw(option.value) %>',
              '    <% if (option.selected) {%>selected="selected"<%} else {%>',
              '    <% if (!select2.multiple && option.value === rawValue) {%>selected="selected"<%}%>',
              '    <% if (select2.multiple && rawValue && rawValue.indexOf(option.value) != -1){%>selected="selected" data-index="rawValue.indexOf(option.value)"<%}%>',
              '    <%}%>',
              '    <%= disabled ? "disabled" : ""%> <%=readonly ? "disabled" : ""%>><%-option.label%></option>',
              '  <%}%>',
              ' </select>',
              '<div class="input-group-append">',
              '<button class="btn btn-primary-icon fa fa-sync get_publication" <%=disabled ? "disabled" : ""%> <%=readonly ? "disabled" : ""%> aria-hidden="true" aria-label="' + gettext('Get Publication') + '" title="' + gettext('Get Publication') + '"></button>',
              '</div>',
              '</div>',
              '<% if (helpMessage && helpMessage.length) { %>',
              '<span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
              '<% } %>',
              '</div>',
            ].join('\n')),

            events:  _.extend({}, Backform.Select2Control.prototype.events(), {
              'click .get_publication': 'getPublication',
            }),

            render: function(){
              return Backform.Select2Control.prototype.render.apply(this, arguments);
            },

            getPublication: function() {
              var self = this;
              var publication_url = pgBrowser.Nodes['database'].generate_url.apply(
                pgBrowser.Nodes['subscription'], [
                  null, 'get_publications', this.field.get('node_data'), null,
                  this.field.get('node_info'), pgBrowser.Nodes['database'].url_jump_after_node,
                ]);
              var result = '';

              $.ajax({
                url: publication_url,
                type: 'GET',
                data: self.model.toJSON(true, 'GET'),
                dataType: 'json',
                contentType: 'application/json',
              })
                .done(function(res) {
                  result = res.data;
                  self.field.set('options', result);
                  Backform.Select2Control.prototype.render.apply(self, arguments);

                  var transform = self.field.get('transform') || self.defaults.transform;
                  if (transform && _.isFunction(transform)) {
                    self.field.set('options', transform.bind(self, result));
                  } else {
                    self.field.set('options', result);
                  }
                  Alertify.info(
                    gettext('Publication fetched successfully.')
                  );


                })
                .fail(function(res) {
                  Alertify.alert(
                    gettext('Check connection?'),
                    gettext(res.responseJSON.errormsg)
                  );
                });
            },
          }),
        },
        {
          id: 'sslmode', label: gettext('SSL mode'), control: 'select2', group: gettext('SSL'),
          select2: {
            allowClear: false,
            minimumResultsForSearch: Infinity,
          },
          mode: ['properties', 'edit', 'create'],
          'options': [
            {label: gettext('Allow'), value: 'allow'},
            {label: gettext('Prefer'), value: 'prefer'},
            {label: gettext('Require'), value: 'require'},
            {label: gettext('Disable'), value: 'disable'},
            {label: gettext('Verify-CA'), value: 'verify-ca'},
            {label: gettext('Verify-Full'), value: 'verify-full'},
          ],
        },{
          id: 'sslcert', label: gettext('Client certificate'), type: 'text',
          group: gettext('SSL'), mode: ['edit', 'create'],
          disabled: 'isSSL', control: Backform.FileControl,
          dialog_type: 'select_file', supp_types: ['*'],
          deps: ['sslmode'],
        },{
          id: 'sslkey', label: gettext('Client certificate key'), type: 'text',
          group: gettext('SSL'), mode: ['edit', 'create'],
          disabled: 'isSSL', control: Backform.FileControl,
          dialog_type: 'select_file', supp_types: ['*'],
          deps: ['sslmode'],
        },{
          id: 'sslrootcert', label: gettext('Root certificate'), type: 'text',
          group: gettext('SSL'), mode: ['edit', 'create'],
          disabled: 'isSSL', control: Backform.FileControl,
          dialog_type: 'select_file', supp_types: ['*'],
          deps: ['sslmode'],
        },{
          id: 'sslcrl', label: gettext('Certificate revocation list'), type: 'text',
          group: gettext('SSL'), mode: ['edit', 'create'],
          disabled: 'isSSL', control: Backform.FileControl,
          dialog_type: 'select_file', supp_types: ['*'],
          deps: ['sslmode'],
        },{
          id: 'sslcompression', label: gettext('SSL compression?'), type: 'switch',
          mode: ['edit', 'create'], group: gettext('SSL'),
          'options': {'size': 'mini'},
          deps: ['sslmode'], disabled: 'isSSL',
        },{
          id: 'sslcert', label: gettext('Client certificate'), type: 'text',
          group: gettext('SSL'), mode: ['properties'],
          deps: ['sslmode'],
          visible: function(model) {
            var sslcert = model.get('sslcert');
            return !_.isUndefined(sslcert) && !_.isNull(sslcert);
          },
        },{
          id: 'sslkey', label: gettext('Client certificate key'), type: 'text',
          group: gettext('SSL'), mode: ['properties'],
          deps: ['sslmode'],
          visible: function(model) {
            var sslkey = model.get('sslkey');
            return !_.isUndefined(sslkey) && !_.isNull(sslkey);
          },
        },{
          id: 'sslrootcert', label: gettext('Root certificate'), type: 'text',
          group: gettext('SSL'), mode: ['properties'],
          deps: ['sslmode'],
          visible: function(model) {
            var sslrootcert = model.get('sslrootcert');
            return !_.isUndefined(sslrootcert) && !_.isNull(sslrootcert);
          },
        },{
          id: 'sslcrl', label: gettext('Certificate revocation list'), type: 'text',
          group: gettext('SSL'), mode: ['properties'],
          deps: ['sslmode'],
          visible: function(model) {
            var sslcrl = model.get('sslcrl');
            return !_.isUndefined(sslcrl) && !_.isNull(sslcrl);
          },
        },{
          id: 'sslcompression', label: gettext('SSL compression?'), type: 'switch',
          mode: ['properties'], group: gettext('SSL'),
          'options': {'size': 'mini'},
          deps: ['sslmode'], visible: function(model) {
            var sslmode = model.get('sslmode');
            return _.indexOf(SSL_MODES, sslmode) != -1;
          },
        },
        {
          id: 'copy_data_after_refresh', label: gettext('Copy data?'),
          type: 'switch', mode: ['edit'],
          group: gettext('With'),
          readonly: 'isRefresh', deps :['refresh_pub'],
          helpMessage: gettext('Specifies whether the existing data in the publications that are being subscribed to should be copied once the replication starts.'),
        },
        {
          id: 'copy_data', label: gettext('Copy data?'),
          type: 'switch', mode: ['create'],
          group: gettext('With'),
          readonly: 'isConnect', deps :['connect'],
          helpMessage: gettext('Specifies whether the existing data in the publications that are being subscribed to should be copied once the replication starts.'),
        },
        {
          id: 'create_slot', label: gettext('Create slot?'),
          type: 'switch', mode: ['create'],
          group: gettext('With'),
          disabled: 'isSameDB',
          readonly: 'isConnect', deps :['connect', 'host', 'port'],
          helpMessage: gettext('Specifies whether the command should create the replication slot on the publisher.This field will be disabled and set to false if subscription connects to same database.Otherwise, the CREATE SUBSCRIPTION call will hang.'),

        },
        {
          id: 'enabled', label: gettext('Enabled?'),
          type: 'switch', mode: ['create','edit', 'properties'],
          group: gettext('With'),
          readonly: 'isConnect', deps :['connect'],
          helpMessage: gettext('Specifies whether the subscription should be actively replicating, or whether it should be just setup but not started yet. '),
        },
        {
          id: 'refresh_pub', label: gettext('Refresh publication?'),
          type: 'switch', mode: ['edit'],
          group: gettext('With'),
          helpMessage: gettext('Fetch missing table information from publisher. '),
          deps:['enabled'], disabled: function(m){
            if (m.get('enabled'))
              return false;
            setTimeout( function() {
              m.set('refresh_pub', false);
            }, 10);
            return true;
          },
        },{
          id: 'connect', label: gettext('Connect?'),
          type: 'switch', mode: ['create'],
          group: gettext('With'),
          disabled: 'isDisable', deps:['enabled', 'create_slot', 'copy_data'],
          helpMessage: gettext('Specifies whether the CREATE SUBSCRIPTION should connect to the publisher at all. Setting this to false will change default values of enabled, create_slot and copy_data to false.'),
        },
        {
          id: 'slot_name', label: gettext('Slot name'),
          type: 'text', mode: ['create','edit', 'properties'],
          group: gettext('With'),
          helpMessage: gettext('Name of the replication slot to use. The default behavior is to use the name of the subscription for the slot name.'),
        },
        {
          id: 'sync', label: gettext('Synchronous commit'), control: 'select2', deps:['event'],
          group: gettext('With'), type: 'text',
          helpMessage: gettext('The value of this parameter overrides the synchronous_commit setting. The default value is off.'),
          select2: {
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
        ],
        isDisable:function(m){
          if (m.isNew())
            return false;
          return true;
        },
        isSameDB:function(m){
          let host = m.attributes['host'],
            port = m.attributes['port'];

          if ((m.attributes['host'] == 'localhost' || m.attributes['host'] == '127.0.0.1') &&
              (m.node_info.server.host == 'localhost' || m.node_info.server.host == '127.0.0.1')){
            host = m.node_info.server.host;
          }
          if (host == m.node_info.server.host && port == m.node_info.server.port){
            setTimeout( function() {
              m.set('create_slot', false);
            }, 10);
            return true;
          }
          return false;
        },
        isAllConnectionDataEnter: function(m){
          let host = m.get('host'),
            db   = m.get('db'),
            port = m.get('port'),
            username = m.get('username');
          if ((!_.isUndefined(host) && host) && (!_.isUndefined(db) && db) && (!_.isUndefined(port) && port) && (!_.isUndefined(username) && username))
            return false;
          return true;
        },
        isConnect: function(m){
          if(!m.get('connect')){
            setTimeout( function() {
              m.set('copy_data', false);
              m.set('create_slot', false);
              m.set('enabled', false);
            }, 10);
            return true;
          }
          return false;
        },
        isRefresh: function(m){
          if (!m.get('refresh_pub') || _.isUndefined(m.get('refresh_pub'))){
            setTimeout( function() {
              m.set('copy_data_after_refresh', false);
            }, 10);
            return true;
          }
          return false;
        },
        isSSL: function(model) {
          var ssl_mode = model.get('sslmode');
          return _.indexOf(SSL_MODES, ssl_mode) == -1;
        },
        sessChanged: function() {
          if (!this.isNew() && _.isUndefined(this.attributes['refresh_pub']))
            return false;
          return pgBrowser.DataModel.prototype.sessChanged.apply(this);
        },
        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the GUI for the respective control.
         */
        validate: function() {
          var msg;
          this.errorModel.clear();
          var name = this.get('name'),
            slot_name = this.get('slot_name');

          if (_.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name cannot be empty.');
            this.errorModel.set('name', msg);
            return msg;
          }

          if (!_.isUndefined(slot_name) && !_.isNull(slot_name)){
            if(/^[a-zA-Z0-9_]+$/.test(slot_name) == false){
              msg = gettext('Replication slot name may only contain lower case letters, numbers, and the underscore character.');
              this.errorModel.set('name', msg);
              return msg;
            }
          }

          const validateModel = new modelValidation.ModelValidation(this);
          return validateModel.validate();
        },
        canCreate: function(itemData, item) {
          var treeData = this.getTreeNodeHierarchy(item),
            server = treeData['server'];

          // If server is less than 10 then do not allow 'create' menu
          if (server && server.version < 100000)
            return false;

          // by default we want to allow create menu
          return true;
        },

      }),
    });
  }
  return pgBrowser.Nodes['coll-subscription'];
});
