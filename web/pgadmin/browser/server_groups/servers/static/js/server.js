define('pgadmin.node.server', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'underscore.string', 'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.server.supported_servers', 'pgadmin.user_management.current_user',
  'pgadmin.alertifyjs', 'pgadmin.backform',
  'sources/browser/server_groups/servers/model_validation',
  'pgadmin.browser.server.privilege',
], function(
  gettext, url_for, $, _, Backbone, S, pgAdmin, pgBrowser,
  supported_servers, current_user, Alertify, Backform,
  modelValidation
) {

  if (!pgBrowser.Nodes['server']) {
    var SSL_MODES = ['prefer', 'require', 'verify-ca', 'verify-full'];

    pgBrowser.SecLabelModel = pgBrowser.Node.Model.extend({
      defaults: {
        provider: undefined,
        label: undefined,
      },
      schema: [{
        id: 'provider', label: gettext('Provider'),
        type: 'text', editable: true,
        cellHeaderClasses:'width_percent_50',
      },{
        id: 'label', label: gettext('Security Label'),
        type: 'text', editable: true,
        cellHeaderClasses:'override_label_class_font_size',
      }],
      validate: function() {
        this.errorModel.clear();

        if (_.isUndefined(this.get('label')) ||
          _.isNull(this.get('label')) ||
            String(this.get('label')).replace(/^\s+|\s+$/g, '') == '') {
          var errmsg = gettext('Label must be specified.');
          this.errorModel.set('label', errmsg);
          return errmsg;
        }

        return null;
      },
    });

    pgAdmin.Browser.Nodes['server'] = pgAdmin.Browser.Node.extend({
      parent_type: 'server_group',
      type: 'server',
      dialogHelp: url_for('help.static', {'filename': 'server_dialog.html'}),
      label: gettext('Server'),
      canDrop: true,
      hasStatistics: true,
      hasCollectiveStatistics: true,
      can_expand: function(d) {
        return d && d.connected;
      },
      Init: function() {

        /* Avoid multiple registration of same menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_server_on_sg', node: 'server_group', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('Server...'),
          data: {action: 'create'}, icon: 'wcTabIcon icon-server',
        },{
          name: 'create_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 3, label: gettext('Server...'),
          data: {action: 'create'}, icon: 'wcTabIcon icon-server',
        },{
          name: 'connect_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'connect_server',
          category: 'connect', priority: 4, label: gettext('Connect Server'),
          icon: 'fa fa-link', enable : 'is_not_connected',
        },{
          name: 'disconnect_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'disconnect_server',
          category: 'drop', priority: 5, label: gettext('Disconnect Server'),
          icon: 'fa fa-chain-broken', enable : 'is_connected',
        },{
          name: 'reload_configuration', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'reload_configuration',
          category: 'reload', priority: 6, label: gettext('Reload Configuration'),
          icon: 'fa fa-repeat', enable : 'enable_reload_config',
        },{
          name: 'restore_point', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'restore_point',
          category: 'restore', priority: 9, label: gettext('Add Named Restore Point...'),
          icon: 'fa fa-anchor', enable : 'is_applicable',
        },{
          name: 'change_password', node: 'server', module: this,
          applies: ['file'], callback: 'change_password',
          label: gettext('Change Password...'),
          icon: 'fa fa-lock', enable : 'is_connected',
        },{
          name: 'wal_replay_pause', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'pause_wal_replay',
          category: 'wal_replay_pause', priority: 7, label: gettext('Pause Replay of WAL'),
          icon: 'fa fa-pause-circle', enable : 'wal_pause_enabled',
        },{
          name: 'wal_replay_resume', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'resume_wal_replay',
          category: 'wal_replay_resume', priority: 8, label: gettext('Resume Replay of WAL'),
          icon: 'fa fa-play-circle', enable : 'wal_resume_enabled',
        }]);

        _.bindAll(this, 'connection_lost');
        pgBrowser.Events.on(
          'pgadmin:server:connection:lost', this.connection_lost
        );
      },
      is_not_connected: function(node) {
        return (node && node.connected != true);
      },
      is_connected: function(node) {
        return (node && node.connected == true);
      },
      enable_reload_config: function(node) {
        // Must be connected & is Super user
        if (node && node._type == 'server' &&
          node.connected && node.user.is_superuser) {
          return true;
        }
        return false;
      },
      is_applicable: function(node) {
        // Must be connected & super user & not in recovery mode
        if (node && node._type == 'server' &&
          node.connected && node.user.is_superuser
            && node.in_recovery == false) {
          return true;
        }
        return false;
      },
      wal_pause_enabled: function(node) {
        // Must be connected & is Super user & in Recovery mode
        if (node && node._type == 'server' &&
          node.connected && node.user.is_superuser
            && node.in_recovery == true
            && node.wal_pause == false) {
          return true;
        }
        return false;
      },
      wal_resume_enabled: function(node) {
        // Must be connected & is Super user & in Recovery mode
        if (node && node._type == 'server' &&
          node.connected && node.user.is_superuser
            && node.in_recovery == true
            && node.wal_pause == true) {
          return true;
        }
        return false;
      },
      callbacks: {
        /* Connect the server */
        connect_server: function(args){
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          connect_to_server(obj, d, t, i, false);
          return false;
        },
        /* Disconnect the server */
        disconnect_server: function(args, notify) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = 'item' in input ? input.item : t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          notify = notify || _.isUndefined(notify) || _.isNull(notify);

          var disconnect = function() {
            $.ajax({
              url: obj.generate_url(i, 'connect', d, true),
              type:'DELETE',
            })
            .done(function(res) {
              if (res.success == 1) {
                Alertify.success(res.info);
                d = t.itemData(i);
                t.removeIcon(i);
                d.connected = false;
                d.icon = 'icon-server-not-connected';
                t.addIcon(i, {icon: d.icon});
                obj.callbacks.refresh.apply(obj, [null, i]);
                if (pgBrowser.serverInfo && d._id in pgBrowser.serverInfo) {
                  delete pgBrowser.serverInfo[d._id];
                }
                pgBrowser.enable_disable_menus(i);
                // Trigger server disconnect event
                pgBrowser.Events.trigger(
                  'pgadmin:server:disconnect',
                  {item: i, data: d}, false
                );
              }
              else {
                try {
                  Alertify.error(res.errormsg);
                } catch (e) {
                  console.warn(e.stack || e);
                }
                t.unload(i);
              }
            })
            .fail(function(xhr, status, error) {
              Alertify.pgRespErrorNotify(xhr, error);
              t.unload(i);
            });
          };

          if (notify) {
            Alertify.confirm(
              gettext('Disconnect server'),
              gettext(
                'Are you sure you want to disconnect the server %(server)s?',
                {server: d.label}
              ),
              function() { disconnect(); },
              function() { return true;}
            );
          } else {
            disconnect();
          }

          return false;
        },
        /* Connect the server (if not connected), before opening this node */
        beforeopen: function(item, data) {

          if(!data || data._type != 'server') {
            return false;
          }

          pgBrowser.tree.addIcon(item, {icon: data.icon});
          if (!data.connected) {
            connect_to_server(this, data, pgBrowser.tree, item, false);

            return false;
          }
          return true;
        },
        added: function(item, data) {

          pgBrowser.serverInfo = pgBrowser.serverInfo || {};
          pgBrowser.serverInfo[data._id] = _.extend({}, data);

          // Call added method of node.js
          pgAdmin.Browser.Node.callbacks.added.apply(this, arguments);
          return true;
        },
        /* Reload configuration */
        reload_configuration: function(args){
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          Alertify.confirm(
            gettext('Reload server configuration'),
            S(
              gettext('Are you sure you want to reload the server configuration on %s?')
            ).sprintf(d.label).value(),
            function() {
              $.ajax({
                url: obj.generate_url(i, 'reload', d, true),
                method:'GET',
              })
              .done(function(res) {
                if (res.data.status) {
                  Alertify.success(res.data.result);
                }
                else {
                  Alertify.error(res.data.result);
                }
              })
              .fail(function(xhr, status, error) {
                Alertify.pgRespErrorNotify(xhr, error);
                t.unload(i);
              });
            },
            function() { return true; }
          );

          return false;
        },
        /* Add restore point */
        restore_point: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          Alertify.prompt(
            gettext('Enter the name of the restore point to add'), '',
            // We will execute this function when user clicks on the OK button
            function(evt, value) {
              // If user has provided a value, send it to the server
              if(!_.isUndefined(value) && !_.isNull(value) && value !== ''
                && String(value).replace(/^\s+|\s+$/g, '') !== '') {
                $.ajax({
                  url: obj.generate_url(i, 'restore_point', d, true),
                  method:'POST',
                  data:{ 'value': JSON.stringify(value) },
                })
                .done(function(res) {
                  Alertify.success(res.data.result, 10);
                })
                .fail(function(xhr, status, error) {
                  Alertify.pgRespErrorNotify(xhr, error);
                  t.unload(i);
                });
              } else {
                evt.cancel = true;
                Alertify.error( gettext('Please enter a valid name.'), 10);
              }
            },
            // We will execute this function when user clicks on the Cancel
            // button.  Do nothing just close it.
            function(evt) { evt.cancel = false; }
          ).set({'title': gettext('Restore point name')});
        },

        /* Change password */
        change_password: function(args){
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined,
            url = obj.generate_url(i, 'change_password', d, true),
            is_pgpass_file_used = false,
            check_pgpass_url = obj.generate_url(i, 'check_pgpass', d, true);

          if (!d)
            return false;

          if(!Alertify.changeServerPassword) {
            var newPasswordModel = Backbone.Model.extend({
                defaults: {
                  user_name: undefined,
                  password: undefined,
                  newPassword: undefined,
                  confirmPassword: undefined,
                },
                validate: function() {
                  return null;
                },
              }),
              passwordChangeFields = [{
                name: 'user_name', label: gettext('User'),
                type: 'text', disabled: true, control: 'input',
              },{
                name: 'password', label: gettext('Current Password'),
                type: 'password', disabled: function() { return is_pgpass_file_used; },
                control: 'input', required: true,
              },{
                name: 'newPassword', label: gettext('New Password'),
                type: 'password', disabled: false, control: 'input',
                required: true,
              },{
                name: 'confirmPassword', label: gettext('Confirm Password'),
                type: 'password', disabled: false, control: 'input',
                required: true,
              }];


            Alertify.dialog('changeServerPassword' ,function factory() {
              return {
                main: function(params) {
                  var title = gettext('Change Password ');
                  this.set('title', title);
                  this.user_name = params.user.name;
                },
                setup:function() {
                  return {
                    buttons: [{
                      text: gettext('Ok'), key: 13, className: 'btn btn-primary',
                      attrs: {name:'submit'},
                    },{
                      text: gettext('Cancel'), key: 27,
                      className: 'btn btn-danger', attrs: {name: 'cancel'},
                    }],
                    // Set options for dialog
                    options: {
                      padding : !1,
                      overflow: !1,
                      modal:false,
                      resizable: true,
                      maximizable: true,
                      pinnable: false,
                      closableByDimmer: false,
                    },
                  };
                },
                hooks: {
                  // triggered when the dialog is closed
                  onclose: function() {
                    if (this.view) {
                      this.view.remove({data: true, internal: true, silent: true});
                    }
                  },
                },
                prepare: function() {
                  var self = this;
                  // Disable Ok button until user provides input
                  this.__internal.buttons[0].element.disabled = true;

                  var $container = $('<div class=\'change_password\'></div>'),
                    newpasswordmodel = new newPasswordModel(
                      {'user_name': self.user_name}
                    ),
                    view = this.view = new Backform.Form({
                      el: $container,
                      model: newpasswordmodel,
                      fields: passwordChangeFields,
                    });

                  view.render();

                  this.elements.content.appendChild($container.get(0));

                  // Listen to model & if filename is provided then enable Backup button
                  this.view.model.on('change', function() {
                    var that = this,
                      password = this.get('password'),
                      newPassword = this.get('newPassword'),
                      confirmPassword = this.get('confirmPassword');

                    // Only check password field if pgpass file is not available
                    if ((!is_pgpass_file_used &&
                      (_.isUndefined(password) || _.isNull(password) || password == '')) ||
                        _.isUndefined(newPassword) || _.isNull(newPassword) || newPassword == '' ||
                        _.isUndefined(confirmPassword) || _.isNull(confirmPassword) || confirmPassword == '') {
                      self.__internal.buttons[0].element.disabled = true;
                    } else if (newPassword != confirmPassword) {
                      self.__internal.buttons[0].element.disabled = true;

                      this.errorTimeout && clearTimeout(this.errorTimeout);
                      this.errorTimeout = setTimeout(function() {
                        that.errorModel.set('confirmPassword', gettext('Passwords do not match.'));
                      } ,400);
                    }else {
                      that.errorModel.clear();
                      self.__internal.buttons[0].element.disabled = false;
                    }
                  });
                },
                // Callback functions when click on the buttons of the Alertify dialogs
                callback: function(e) {
                  if (e.button.element.name == 'submit') {
                    var self = this,
                      args =  this.view.model.toJSON();

                    e.cancel = true;

                    $.ajax({
                      url: url,
                      method:'POST',
                      data:{'data': JSON.stringify(args) },
                    })
                    .done(function(res) {
                      if (res.success) {
                        // Notify user to update pgpass file
                        if(is_pgpass_file_used) {
                          Alertify.alert(
                            gettext('Change Password'),
                            gettext('Please make sure to disconnect the server'
                              + ' and update the new password in the pgpass file'
                                + ' before performing any other operation')
                          );
                        }

                        Alertify.success(res.info);
                        self.close();
                      } else {
                        Alertify.error(res.errormsg);
                      }
                    })
                    .fail(function(xhr, status, error) {
                      Alertify.pgRespErrorNotify(xhr, error);
                    });
                  }
                },
              };
            });
          }

          // Call to check if server is using pgpass file or not
          $.ajax({
            url: check_pgpass_url,
            method:'GET',
          })
          .done(function(res) {
            if (res.success && res.data.is_pgpass) {
              is_pgpass_file_used = true;
            }
            Alertify.changeServerPassword(d).resizeTo('40%','52%');
          })
          .fail(function(xhr, status, error) {
            Alertify.pgRespErrorNotify(xhr, error);
          });

          return false;
        },

        /* Pause WAL Replay */
        pause_wal_replay: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          $.ajax({
            url: obj.generate_url(i, 'wal_replay' , d, true),
            type:'DELETE',
            dataType: 'json',
          })
          .done(function(res) {
            if (res.success == 1) {
              Alertify.success(res.info);
              t.itemData(i).wal_pause=res.data.wal_pause;
              t.unload(i);
              t.setInode(i);
              t.deselect(i);
              // Fetch updated data from server
              setTimeout(function() {
                t.select(i);
              }, 10);
            }
          })
          .fail(function(xhr, status, error) {
            Alertify.pgRespErrorNotify(xhr, error);
            t.unload(i);
          });
        },

        /* Resume WAL Replay */
        resume_wal_replay: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          $.ajax({
            url: obj.generate_url(i, 'wal_replay' , d, true),
            type:'PUT',
            dataType: 'json',
          })
          .done(function(res) {
            if (res.success == 1) {
              Alertify.success(res.info);
              t.itemData(i).wal_pause=res.data.wal_pause;
              t.unload(i);
              t.setInode(i);
              t.deselect(i);
              // Fetch updated data from server
              setTimeout(function() {
                t.select(i);
              }, 10);
            }
          })
          .fail(function(xhr, status, error) {
            Alertify.pgRespErrorNotify(xhr, error);
            t.unload(i);
          });
        },
      },
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          gid: undefined,
          id: undefined,
          name: '',
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
          db_res: '',
          passfile: undefined,
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
          tunnel_authentication: 0,
          connect_timeout: 0,
        },
        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            this.set({'gid': args.node_info['server_group']._id});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        schema: [{
          id: 'id', label: gettext('ID'), type: 'int', mode: ['properties'],
        },{
          id: 'name', label: gettext('Name'), type: 'text',
          mode: ['properties', 'edit', 'create'],
        },{
          id: 'gid', label: gettext('Server group'), type: 'int',
          control: 'node-list-by-id', node: 'server_group',
          mode: ['create', 'edit'], select2: {allowClear: false},
        },{
          id: 'server_type', label: gettext('Server type'), type: 'options',
          mode: ['properties'], visible: 'isConnected',
          'options': supported_servers,
        },{
          id: 'connected', label: gettext('Connected?'), type: 'switch',
          mode: ['properties'], group: gettext('Connection'), 'options': {
            'onText':  gettext('True'), 'offText':  gettext('False'), 'size': 'small',
          },
        },{
          id: 'version', label: gettext('Version'), type: 'text', group: null,
          mode: ['properties'], visible: 'isConnected',
        },{
          id: 'bgcolor', label: gettext('Background'), type: 'color',
          group: null, mode: ['edit', 'create'], disabled: 'isfgColorSet',
          deps: ['fgcolor'],
        },{
          id: 'fgcolor', label: gettext('Foreground'), type: 'color',
          group: null, mode: ['edit', 'create'], disabled: 'isConnected',
        },{
          id: 'connect_now', controlLabel: gettext('Connect now?'), type: 'checkbox',
          group: null, mode: ['create'],
        },{
          id: 'comment', label: gettext('Comments'), type: 'multiline', group: null,
          mode: ['properties', 'edit', 'create'],
        },{
          id: 'host', label: gettext('Host name/address'), type: 'text', group: gettext('Connection'),
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected',
        },{
          id: 'port', label: gettext('Port'), type: 'int', group: gettext('Connection'),
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected', min: 1, max: 65535,
        },{
          id: 'db', label: gettext('Maintenance database'), type: 'text', group: gettext('Connection'),
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected',
        },{
          id: 'username', label: gettext('Username'), type: 'text', group: gettext('Connection'),
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected',
        },{
          id: 'password', label: gettext('Password'), type: 'password',
          group: gettext('Connection'), control: 'input', mode: ['create'], deps: ['connect_now'],
          visible: function(model) {
            return model.get('connect_now') && model.isNew();
          },
        },{
          id: 'save_password', controlLabel: gettext('Save password?'),
          type: 'checkbox', group: gettext('Connection'), mode: ['create'],
          deps: ['connect_now', 'use_ssh_tunnel'], visible: function(model) {
            return model.get('connect_now') && model.isNew();
          },
          disabled: function(model) {
            if (!current_user.allow_save_password)
              return true;

            if (model.get('use_ssh_tunnel')) {
              if (model.get('save_password')) {
                Alertify.alert(
                  gettext('Stored Password'),
                  gettext('Database passwords cannot be stored when using SSH tunnelling. The \'Save password\' option has been turned off.')
                );
              }

              setTimeout(function() {
                model.set('save_password', false);
              }, 10);

              return true;
            }

            return false;
          },
        },{
          id: 'role', label: gettext('Role'), type: 'text', group: gettext('Connection'),
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected',
        },{
          id: 'sslmode', label: gettext('SSL mode'), type: 'options', group: gettext('SSL'),
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected',
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
          'options': {'size': 'small'},
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
          'options': {'size': 'small'},
          deps: ['sslmode'], visible: function(model) {
            var sslmode = model.get('sslmode');
            return _.indexOf(SSL_MODES, sslmode) != -1;
          },
        },{
          id: 'use_ssh_tunnel', label: gettext('Use SSH tunneling'), type: 'switch',
          mode: ['properties', 'edit', 'create'], group: gettext('SSH Tunnel'),
          'options': {'size': 'small'},
          disabled: function(model) {
            if (!pgAdmin.Browser.utils.support_ssh_tunnel) {
              setTimeout(function() {
                model.set('use_ssh_tunnel', 0);
              }, 10);

              return true;
            }

            return model.get('connected');
          },
        },{
          id: 'tunnel_host', label: gettext('Tunnel host'), type: 'text', group: gettext('SSH Tunnel'),
          mode: ['properties', 'edit', 'create'], deps: ['use_ssh_tunnel'],
          disabled: function(model) {
            return !model.get('use_ssh_tunnel');
          },
        },{
          id: 'tunnel_port', label: gettext('Tunnel port'), type: 'int', group: gettext('SSH Tunnel'),
          mode: ['properties', 'edit', 'create'], deps: ['use_ssh_tunnel'], max: 65535,
          disabled: function(model) {
            return !model.get('use_ssh_tunnel');
          },
        },{
          id: 'tunnel_username', label: gettext('Username'), type: 'text', group: gettext('SSH Tunnel'),
          mode: ['properties', 'edit', 'create'], deps: ['use_ssh_tunnel'],
          disabled: function(model) {
            return !model.get('use_ssh_tunnel');
          },
        },{
          id: 'tunnel_authentication', label: gettext('Authentication'), type: 'switch',
          mode: ['properties', 'edit', 'create'], group: gettext('SSH Tunnel'),
          'options': {'onText':  gettext('Identity file'),
            'offText':  gettext('Password'), 'size': 'small'},
          deps: ['use_ssh_tunnel'],
          disabled: function(model) {
            return !model.get('use_ssh_tunnel');
          },
        }, {
          id: 'tunnel_identity_file', label: gettext('Identity file'), type: 'text',
          group: gettext('SSH Tunnel'), mode: ['edit', 'create'],
          control: Backform.FileControl, dialog_type: 'select_file', supp_types: ['*'],
          deps: ['tunnel_authentication', 'use_ssh_tunnel'],
          disabled: function(model) {
            let file = model.get('tunnel_identity_file');
            if (!model.get('tunnel_authentication') && file) {
              setTimeout(function() {
                model.set('tunnel_identity_file', null);
              }, 10);
            }
            return !model.get('tunnel_authentication') || !model.get('use_ssh_tunnel');
          },
        },{
          id: 'tunnel_identity_file', label: gettext('Identity file'), type: 'text',
          group: gettext('SSH Tunnel'), mode: ['properties'],
        },{
          id: 'tunnel_password', label: gettext('Password'), type: 'password',
          group: gettext('SSH Tunnel'), control: 'input', mode: ['create'],
          deps: ['use_ssh_tunnel'],
          disabled: function(model) {
            return !model.get('use_ssh_tunnel');
          },
        }, {
          id: 'hostaddr', label: gettext('Host address'), type: 'text', group: gettext('Advanced'),
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected',
        },{
          id: 'db_res', label: gettext('DB restriction'), type: 'select2', group: gettext('Advanced'),
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected', select2: {multiple: true, allowClear: false,
            tags: true, tokenSeparators: [','], first_empty: false, selectOnClose: true, emptyOptions: true},
        },{
          id: 'passfile', label: gettext('Password file'), type: 'text',
          group: gettext('Advanced'), mode: ['edit', 'create'],
          disabled: 'isConnectedWithValidLib', control: Backform.FileControl,
          dialog_type: 'select_file', supp_types: ['*'],
        },{
          id: 'passfile', label: gettext('Password file'), type: 'text',
          group: gettext('Advanced'), mode: ['properties'],
          visible: function(model) {
            var passfile = model.get('passfile');
            return !_.isUndefined(passfile) && !_.isNull(passfile);
          },
        },{
          id: 'service', label: gettext('Service'), type: 'text',
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected',
          group: gettext('Connection'),
        },{
          id: 'connect_timeout', label: gettext('Connection timeout (seconds)'),
          type: 'int', group: gettext('Advanced'),
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected',
          min: 0,
        }],
        validate: function() {
          const validateModel = new modelValidation.ModelValidation(this);
          return validateModel.validate();
        },
        isConnected: function(model) {
          return model.get('connected');
        },
        isfgColorSet: function(model) {
          var bgcolor = model.get('bgcolor'),
            fgcolor = model.get('fgcolor');

          if(model.get('connected')) {
            return true;
          }
          // If fgcolor is set and bgcolor is not set then force bgcolor
          // to set as white
          if(_.isUndefined(bgcolor) || _.isNull(bgcolor) || !bgcolor) {
            if(fgcolor) {
              model.set('bgcolor', '#ffffff');
            }
          }

          return false;
        },
        isSSL: function(model) {
          var ssl_mode = model.get('sslmode');
          // If server is not connected and have required SSL option
          if(model.get('connected')) {
            return true;
          }
          return _.indexOf(SSL_MODES, ssl_mode) == -1;
        },
        isConnectedWithValidLib: function(model) {
          if(model.get('connected')) {
            return true;
          }
          // older version of libpq do not support 'passfile' parameter in
          // connect method, valid libpq must have version >= 100000
          return pgBrowser.utils.pg_libpq_version < 100000;
        },
      }),
      connection_lost: function(i, resp) {
        if (pgBrowser.tree) {
          var t = pgBrowser.tree,
            d = i && t.itemData(i),
            self = this;

          while (d && d._type != 'server') {
            i = t.parent(i);
            d = i && t.itemData(i);
          }

          if (i && d && d._type == 'server') {
            if (_.isUndefined(d.is_connecting) || !d.is_connecting) {
              d.is_connecting = true;

              var disconnect = function(_sid) {
                if (d._id == _sid) {
                  d.is_connecting = false;
                  // Stop listening to the connection cancellation event
                  pgBrowser.Events.off(
                    'pgadmin:server:connect:cancelled', disconnect
                  );

                  // Connection to the database will also be cancelled
                  pgBrowser.Events.trigger(
                    'pgadmin:database:connect:cancelled',_sid,
                    resp.data.database || d.db
                  );

                  // Make sure - the server is disconnected properly
                  pgBrowser.Events.trigger(
                    'pgadmin:server:disconnect',
                    {item: i, data: d}, false
                  );
                }
              };

              // Listen for the server connection cancellation event
              pgBrowser.Events.on(
                'pgadmin:server:connect:cancelled', disconnect
              );
              Alertify.confirm(
                gettext('Connection lost'),
                gettext('Would you like to reconnect to the database?'),
                function() {
                  connect_to_server(self, d, t, i, true);
                },
                function() {
                  d.is_connecting = false;
                  t.unload(i);
                  t.setInode(i);
                  t.addIcon(i, {icon: 'icon-database-not-connected'});
                  pgBrowser.Events.trigger(
                    'pgadmin:server:connect:cancelled', i, d, self
                  );
                  t.select(i);
                });
            }
          }
        }
      },
    });
    var connect_to_server = function(obj, data, tree, item, reconnect) {
      var wasConnected = reconnect || data.connected,
        onFailure = function(
          xhr, status, error, _node, _data, _tree, _item, _wasConnected
        ) {
          data.connected = false;

          // It should be attempt to reconnect.
          // Let's not change the status of the tree node now.
          if (!_wasConnected) {
            tree.setInode(_item);
            tree.addIcon(_item, {icon: 'icon-server-not-connected'});
          }

          Alertify.pgNotifier('error', xhr, error, function(msg) {
            setTimeout(function() {
              Alertify.dlgServerPass(
                gettext('Connect to Server'),
                msg, _node, _data, _tree, _item, _wasConnected
              ).resizeTo();
            }, 100);
          });
        },
        onSuccess = function(res, node, data, tree, item, _wasConnected) {
          if (res && res.data) {
            if (typeof res.data.icon == 'string') {
              tree.removeIcon(item);
              data.icon = res.data.icon;
              tree.addIcon(item, {icon: data.icon});
            }

            _.extend(data, res.data);
            data.is_connecting = false;

            var serverInfo = pgBrowser.serverInfo =
              pgBrowser.serverInfo || {};
            serverInfo[data._id] = _.extend({}, data);

            Alertify.success(res.info);
            obj.trigger('connected', obj, item, data);

            // Generate the event that server is connected
            pgBrowser.Events.trigger(
              'pgadmin:server:connected', data._id, item, data
            );
            // Generate the event that database is connected
            pgBrowser.Events.trigger(
              'pgadmin:database:connected', data._id, data.db, item, data
            );

            // We're not reconnecting
            if (!_wasConnected) {
              tree.setInode(item);
              tree.deselect(item);

              setTimeout(function() {
                tree.select(item);
                tree.open(item);
              }, 10);
            } else {
              // We just need to refresh the tree now.
              setTimeout(function() {
                node.callbacks.refresh.apply(node, [true]);
              }, 10);
            }
          }
        };

      // Ask Password and send it back to the connect server
      if (!Alertify.dlgServerPass) {
        Alertify.dialog('dlgServerPass', function factory() {
          return {
            main: function(
              title, message, node, data, tree, item,
              _status, _onSuccess, _onFailure, _onCancel
            ) {
              this.set('title', title);
              this.message = message;
              this.tree = tree;
              this.nodeData = data;
              this.nodeItem = item;
              this.node= node;
              this.connected = _status;
              this.onSuccess = _onSuccess || onSuccess;
              this.onFailure = _onFailure || onFailure;
              this.onCancel = _onCancel || onCancel;
            },
            setup:function() {
              return {
                buttons:[{
                  text: gettext('OK'), key: 13, className: 'btn btn-primary',
                },{
                  text: gettext('Cancel'), className: 'btn btn-danger',
                  key: 27,
                }],
                focus: {element: '#password', select: true},
                options: {
                  modal: 0, resizable: false, maximizable: false, pinnable: false,
                },
              };
            },
            build:function() {},
            prepare:function() {
              this.setContent(this.message);
            },
            callback: function(closeEvent) {
              var _tree = this.tree,
                _item = this.nodeItem,
                _node = this.node,
                _data = this.nodeData,
                _status = this.connected,
                _onSuccess = this.onSuccess,
                _onFailure = this.onFailure,
                _onCancel = this.onCancel;

              if (closeEvent.button.text == gettext('OK')) {

                var _url = _node.generate_url(_item, 'connect', _data, true);

                if (!_status) {
                  _tree.setLeaf(_item);
                  _tree.removeIcon(_item);
                  _tree.addIcon(_item, {icon: 'icon-server-connecting'});
                }

                $.ajax({
                  type: 'POST',
                  timeout: 30000,
                  url: _url,
                  data: $('#frmPassword').serialize(),
                })
                .done(function(res) {
                  return _onSuccess(
                    res, _node, _data, _tree, _item, _status
                  );
                })
                .fail(function(xhr, status, error) {
                  return _onFailure(
                    xhr, status, error, _node, _data, _tree, _item, _status
                  );
                });
              } else {
                _onCancel && typeof(_onCancel) == 'function' &&
                  _onCancel(_tree, _item, _data, _status);
              }
            },
          };
        });
      }

      var onCancel = function(_tree, _item, _data, _status) {
        _data.is_connecting = false;
        _tree.unload(_item);
        _tree.setInode(_item);
        _tree.removeIcon(_item);
        _tree.addIcon(_item, {icon: 'icon-server-not-connected'});
        obj.trigger('connect:cancelled', data._id, data.db, obj, _item, _data);
        pgBrowser.Events.trigger(
          'pgadmin:server:connect:cancelled', data._id, _item, _data, obj
        );
        pgBrowser.Events.trigger(
          'pgadmin:database:connect:cancelled', data._id, data.db, _item, _data, obj
        );
        if (_status) {
          _tree.select(_item);
        }
      };

      data.is_connecting = true;
      var url = obj.generate_url(item, 'connect', data, true);
      $.post(url)
        .done(function(res) {
          if (res.success == 1) {
            return onSuccess(
              res, obj, data, tree, item, wasConnected
            );
          }
        })
        .fail(function(xhr, status, error) {
          return onFailure(
            xhr, status, error, obj, data, tree, item, wasConnected
          );
        });
    };
  }

  return pgBrowser.Nodes['server'];
});
