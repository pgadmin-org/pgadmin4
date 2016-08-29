define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser', 'alertify'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  if (!pgBrowser.Nodes['server']) {

    var SecurityModel = pgBrowser.SecLabelModel = pgBrowser.Node.Model.extend({
      defaults: {
        provider: undefined,
        label: undefined
      },
      schema: [{
        id: 'provider', label: '{{ _('Provider') }}',
        type: 'text', editable: true,
        cellHeaderClasses:'width_percent_50'
      },{
        id: 'label', label: '{{ _('Security Label') }}',
        type: 'text', editable: true,
        cellHeaderClasses:'width_percent_50'
      }],
      validate: function() {
        var err = {},
          errmsg = null;
        this.errorModel.clear();

        if (_.isUndefined(this.get('label')) ||
          _.isNull(this.get('label')) ||
          String(this.get('label')).replace(/^\s+|\s+$/g, '') == '') {
            errmsg = '{{ _('Label must be specified.') }}';
            this.errorModel.set('label', errmsg);
            return errmsg;
        }

        return null;
      }
    });

    pgAdmin.Browser.Nodes['server'] = pgAdmin.Browser.Node.extend({
      parent_type: 'server-group',
      type: 'server',
      dialogHelp: '{{ url_for('help.static', filename='server_dialog.html') }}',
      label: '{{ _('Server') }}',
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
          name: 'create_server_on_sg', node: 'server-group', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: '{{ _('Server...') }}',
          data: {action: 'create'}, icon: 'wcTabIcon icon-server'
        },{
          name: 'create_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 3, label: '{{ _('Server...') }}',
          data: {action: 'create'}, icon: 'wcTabIcon icon-server'
        },{
          name: 'connect_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'connect_server',
          category: 'connect', priority: 4, label: '{{ _('Connect Server') }}',
          icon: 'fa fa-link', enable : 'is_not_connected'
        },{
          name: 'disconnect_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'disconnect_server',
          category: 'drop', priority: 5, label: '{{ _('Disconnect Server') }}',
          icon: 'fa fa-chain-broken', enable : 'is_connected'
        },{
          name: 'reload_configuration', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'reload_configuration',
          category: 'reload', priority: 6, label: '{{ _('Reload Configuration') }}',
          icon: 'fa fa-repeat', enable : 'enable_reload_config'
        },{
          name: 'restore_point', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'restore_point',
          category: 'restore', priority: 9, label: '{{ _('Add Named Restore Point...') }}',
          icon: 'fa fa-anchor', enable : 'is_applicable'
        },{
          name: 'change_password', node: 'server', module: this,
          applies: ['file'], callback: 'change_password',
          label: '{{ _('Change Password...') }}',
          icon: 'fa fa-lock', enable : 'is_connected'
        },{
          name: 'wal_replay_pause', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'pause_wal_replay',
          category: 'wal_replay_pause', priority: 7, label: '{{ _('Pause Replay of WAL') }}',
          icon: 'fa fa-pause-circle', enable : 'wal_pause_enabled'
        },{
          name: 'wal_replay_resume', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'resume_wal_replay',
          category: 'wal_replay_resume', priority: 8, label: '{{ _('Resume Replay of WAL') }}',
          icon: 'fa fa-play-circle', enable : 'wal_resume_enabled'
         }]);

        pgBrowser.messages['PRIV_GRANTEE_NOT_SPECIFIED'] =
          '{{ _('A grantee must be selected.') }}';
        pgBrowser.messages['NO_PRIV_SELECTED'] =
          '{{ _('At least one privilege should be selected.') }}';

        pgBrowser.Events.on(
          'pgadmin:server:disconnect', this.callbacks.disconnect_server
        );
        pgBrowser.Events.on(
          'pgadmin:server:connect', this.callbacks.connect_server
        );

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
        if (node && node._type == "server" &&
            node.connected && node.user.is_superuser) {
          return true
        }
        return false;
      },
      is_applicable: function(node) {
        // Must be connected & super user & not in recovery mode
        if (node && node._type == "server" &&
            node.connected && node.user.is_superuser
            && node.in_recovery == false) {
            return true;
        }
        return false;
      },
      wal_pause_enabled: function(node) {
        // Must be connected & is Super user & in Recovery mode
        if (node && node._type == "server" &&
            node.connected && node.user.is_superuser
            && node.in_recovery == true
            && node.wal_pause == false) {
            return true;
        }
        return false;
      },
      wal_resume_enabled: function(node) {
        // Must be connected & is Super user & in Recovery mode
        if (node && node._type == "server" &&
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
              success: function(res) {
                if (res.success == 1) {
                  alertify.success(res.info);
                  d = t.itemData(i);
                  t.removeIcon(i);
                  d.connected = false;
                  d.icon = 'icon-server-not-connected';
                  t.addIcon(i, {icon: d.icon});
                  obj.callbacks.refresh.apply(obj, [null, i]);
                  if (pgBrowser.serverInfo && d._id in pgBrowser.serverInfo) {
                    delete pgBrowser.serverInfo[d._id]
                  }
                  obj.trigger('server-disconnected', obj, i, d);
                }
                else {
                  try {
                    alertify.error(res.errormsg);
                  } catch (e) {}
                  t.unload(i);
                }
              },
              error: function(xhr, status, error) {
                try {
                  var err = $.parseJSON(xhr.responseText);
                  if (err.success == 0) {
                    alertify.error(err.errormsg);
                  }
                } catch (e) {}
                t.unload(i);
              }
            });
          };

          if (notify) {
            alertify.confirm(
              '{{ _('Disconnect server') }}',
              S('{{ _('Are you sure you want to disconnect the server %s?') }}').sprintf(
                d.label
              ).value(),
              function(evt) {
                disconnect();
              },
              function(evt) {
                return true;
              });
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

          alertify.confirm(
            '{{ _('Reload server configuration') }}',
            S('{{ _('Are you sure you want to reload the server configuration on %s?') }}').sprintf(d.label).value(),
            function(evt) {
              $.ajax({
                url: obj.generate_url(i, 'reload', d, true),
                method:'GET',
                success: function(res) {
                  if (res.data.status) {
                    alertify.success(res.data.result);
                  }
                  else {
                    alertify.error(res.data.result);
                  }
                },
                error: function(xhr, status, error) {
                  try {
                    var err = $.parseJSON(xhr.responseText);
                    if (err.success == 0) {
                      alertify.error(err.errormsg);
                    }
                  } catch (e) {}
                  t.unload(i);
                }
              });
          },
          function(evt) {
              return true;
          });

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

          alertify.prompt('{{ _('Enter the name of the restore point to add') }}', '',
           // We will execute this function when user clicks on the OK button
           function(evt, value) {
             // If user has provided a value, send it to the server
             if(!_.isUndefined(value) && !_.isNull(value) && value !== ''
                && String(value).replace(/^\s+|\s+$/g, '') !== '') {
              $.ajax({
                url: obj.generate_url(i, 'restore_point', d, true),
                method:'POST',
                data:{ 'value': JSON.stringify(value) },
                success: function(res) {
                    alertify.success(res.data.result, 10);
                },
                error: function(xhr, status, error) {
                  try {
                    var err = $.parseJSON(xhr.responseText);
                    if (err.success == 0) {
                      alertify.error(err.errormsg, 10);
                    }
                  } catch (e) {}
                  t.unload(i);
                }
              });
             } else {
                evt.cancel = true;
                alertify.error('{{ _('Please enter a valid name.') }}', 10);
             }
           },
           // We will execute this function when user clicks on the Cancel button
           // Do nothing just close it
           function(evt, value) {
             evt.cancel = false;
           }
          ).set({'title':'Restore point name'});
        },

        /* Change password */
        change_password: function(args){
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined,
            node = d && pgBrowser.Nodes[d._type],
            url = obj.generate_url(i, 'change_password', d, true);

          if (!d)
            return false;

          if(!alertify.changeServerPassword) {
            var newPasswordModel = Backbone.Model.extend({
                defaults: {
                  user_name: undefined,
                  password: undefined,
                  newPassword: undefined,
                  confirmPassword: undefined
                },
                validate: function() {
                  return null;
                }
              }),
              passwordChangeFields = [{
                  name: 'user_name', label: '{{ _('User') }}',
                  type: 'text', disabled: true, control: 'input'
                },{
                  name: 'password', label: '{{ _('Current Password') }}',
                  type: 'password', disabled: false, control: 'input',
                  required: true
                },{
                  name: 'newPassword', label: '{{ _('New Password') }}',
                  type: 'password', disabled: false, control: 'input',
                  required: true
                },{
                  name: 'confirmPassword', label: '{{ _('Confirm Password') }}',
                  type: 'password', disabled: false, control: 'input',
                  required: true
                }];


            alertify.dialog('changeServerPassword' ,function factory() {
              return {
                 main: function(params) {
                  var title = '{{ _('Change Password') }} ';
                  this.set('title', title);
                  this.user_name = params.user.name;
                 },
                 setup:function() {
                  return {
                    buttons: [{
                      text: '{{ _('Ok') }}', key: 27, className: 'btn btn-primary', attrs:{name:'submit'}
                      },{
                      text: '{{ _('Cancel') }}', key: 27, className: 'btn btn-danger', attrs:{name:'cancel'}
                    }],
                    // Set options for dialog
                    options: {
                      padding : !1,
                      overflow: !1,
                      model: 0,
                      resizable: true,
                      maximizable: true,
                      pinnable: false,
                      closableByDimmer: false
                    }
                  };
                },
                hooks: {
                  // triggered when the dialog is closed
                  onclose: function() {
                    if (this.view) {
                      this.view.remove({data: true, internal: true, silent: true});
                    }
                  }
                },
                prepare: function() {
                  var self = this;
                  // Disable Backup button until user provides Filename
                  this.__internal.buttons[0].element.disabled = true;
                  var $container = $("<div class='change_password'></div>"),
                    newpasswordmodel = new newPasswordModel({'user_name': self.user_name});

                  var view = this.view = new Backform.Form({
                    el: $container,
                    model: newpasswordmodel,
                    fields: passwordChangeFields});

                  view.render();

                  this.elements.content.appendChild($container.get(0));

                  // Listen to model & if filename is provided then enable Backup button
                  this.view.model.on('change', function() {
                    var that = this,
                        password = this.get('password'),
                        newPassword = this.get('newPassword'),
                        confirmPassword = this.get('confirmPassword');

                    if (_.isUndefined(password) || _.isNull(password) || password == '' ||
                        _.isUndefined(newPassword) || _.isNull(newPassword) || newPassword == '' ||
                        _.isUndefined(confirmPassword) || _.isNull(confirmPassword) || confirmPassword == '') {
                      self.__internal.buttons[0].element.disabled = true;
                    } else if (newPassword != confirmPassword) {
                      self.__internal.buttons[0].element.disabled = true;

                      this.errorTimeout && clearTimeout(this.errorTimeout);
                      this.errorTimeout = setTimeout(function() {
                        that.errorModel.set('confirmPassword', '{{ _('Passwords do not match.') }}');
                        } ,400);
                    }else {
                      that.errorModel.clear();
                      self.__internal.buttons[0].element.disabled = false;
                    }
                  });
                },
                // Callback functions when click on the buttons of the Alertify dialogs
                callback: function(e) {
                  if (e.button.element.name == "submit") {
                    var self = this,
                        args =  this.view.model.toJSON();

                    e.cancel = true;

                    $.ajax({
                      url: url,
                      method:'POST',
                      data:{'data': JSON.stringify(args) },
                      success: function(res) {
                        if (res.success) {
                          alertify.success(res.info);
                          self.close();
                        } else {
                          alertify.error(res.errormsg);
                        }
                      },
                      error: function(xhr, status, error) {
                        try {
                          var err = $.parseJSON(xhr.responseText);
                          if (err.success == 0) {
                            alertify.error(err.errormsg);
                          }
                        } catch (e) {}
                      }
                    });
                  }
               }
              };
            });
          }

          alertify.changeServerPassword(d).resizeTo('40%','52%');
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

          var data = d;
          $.ajax({
            url: obj.generate_url(i, 'wal_replay' , d, true),
            type:'DELETE',
            dataType: "json",
            success: function(res) {
              if (res.success == 1) {
                alertify.success(res.info);
                t.itemData(i).wal_pause=res.data.wal_pause;
                t.unload(i);
                t.setInode(i);
                t.deselect(i);
                // Fetch updated data from server
                setTimeout(function() {
                  t.select(i);
                }, 10);
              }
            },
            error: function(xhr, status, error) {
              try {
                var err = $.parseJSON(xhr.responseText);
                if (err.success == 0) {
                  msg = S(err.errormsg).value();
                  alertify.error(err.errormsg);
                }
              } catch (e) {}
              t.unload(i);
            }
          })
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

          var data = d;
          $.ajax({
            url: obj.generate_url(i, 'wal_replay' , d, true),
            type:'PUT',
            dataType: "json",
            success: function(res) {
              if (res.success == 1) {
                alertify.success(res.info);
                t.itemData(i).wal_pause=res.data.wal_pause;
                t.unload(i);
                t.setInode(i);
                t.deselect(i);
                // Fetch updated data from server
                setTimeout(function() {
                  t.select(i);
                }, 10);
              }
            },
            error: function(xhr, status, error) {
              try {
                var err = $.parseJSON(xhr.responseText);
                if (err.success == 0) {
                  msg = S(err.errormsg).value();
                  alertify.error(err.errormsg);
                }
              } catch (e) {}
              t.unload(i);
            }
          })
        }
      },
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          gid: undefined,
          id: undefined,
          name: '',
          sslmode: 'prefer',
          host: '',
          port: 5432,
          db: 'postgres',
          username: '{{ username }}',
          role: null,
          connect_now: true,
          password: undefined,
          save_password: false
        },
        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            this.set({'gid': args.node_info['server-group']._id});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        schema: [{
          id: 'id', label: '{{ _('ID') }}', type: 'int', mode: ['properties']
        },{
          id: 'name', label:'{{ _('Name') }}', type: 'text',
          mode: ['properties', 'edit', 'create']
        },{
          id: 'gid', label: '{{ _('Server group') }}', type: 'int',
          control: 'node-list-by-id', node: 'server-group',
          mode: ['create', 'edit'], select2: {allowClear: false}
        },{
          id: 'server_type', label: '{{ _('Server type') }}', type: 'options',
          mode: ['properties'], visible: 'isConnected',
          'options': [{% for st in server_types %}
            {label: '{{ st.description }}', value: '{{ st.server_type }}'},{% endfor %}
            {label: '{{ _('Unknown') }}', value: ''}
          ]
        },{
          id: 'connected', label:'{{ _('Connected?') }}', type: 'switch',
          mode: ['properties'], group: "{{ 'Connection' }}", 'options': {
            'onText':   'True', 'offText':  'False', 'onColor':  'success',
            'offColor': 'danger', 'size': 'small'
          }
        },{
          id: 'version', label:'{{ _('Version') }}', type: 'text', group: null,
          mode: ['properties'], visible: 'isConnected'
        },{
          id: 'connect_now', controlLabel:'{{ _('Connect now?') }}', type: 'checkbox',
          group: null, mode: ['create']
        },{
          id: 'comment', label:'{{ _('Comments') }}', type: 'multiline', group: null,
          mode: ['properties', 'edit', 'create']
        },{
          id: 'host', label:'{{ _('Host name/address') }}', type: 'text', group: "{{ 'Connection' }}",
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected'
        },{
          id: 'port', label:'{{ _('Port') }}', type: 'int', group: "{{ 'Connection' }}",
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected', min: 1024, max: 65535
        },{
          id: 'db', label:'{{ _('Maintenance database') }}', type: 'text', group: "{{ 'Connection' }}",
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected'
        },{
          id: 'username', label:'{{ _('User name') }}', type: 'text', group: "{{ 'Connection' }}",
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected'
        },{
          id: 'password', label:'{{ _('Password') }}', type: 'password',
          group: "{{ 'Connection' }}", control: 'input', mode: ['create'], deps: ['connect_now'],
          visible: function(m) {
            return m.get('connect_now') && m.isNew();
          }
        },{
          id: 'save_password', controlLabel:'{{ _('Save password?') }}', type: 'checkbox',
          group: "{{ 'Connection' }}", mode: ['create'], deps: ['connect_now'],
          visible: function(m) {
            return m.get('connect_now') && m.isNew();
          }
        },{
          id: 'role', label:'{{ _('Role') }}', type: 'text', group: "{{ 'Connection' }}",
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected'
        },{
          id: 'sslmode', label:'{{ _('SSL mode') }}', type: 'options', group: "{{ 'Connection' }}",
          mode: ['properties', 'edit', 'create'], disabled: 'isConnected',
          'options': [
            {label: 'Allow', value: 'allow'},
            {label: 'Prefer', value: 'prefer'},
            {label: 'Require', value: 'require'},
            {label: 'Disable', value: 'disable'},
            {label: 'Verify-CA', value: 'verify-ca'},
            {label: 'Verify-Full', value: 'verify-full'}
          ]
        }],
        validate: function() {
          var err = {},
              errmsg,
              self = this;

          var check_for_empty = function(id, msg) {
            var v = self.get(id);
            if (
              _.isUndefined(v) || String(v).replace(/^\s+|\s+$/g, '') == ''
            ) {
              err[id] = msg;
              errmsg = errmsg || msg;
            } else {
              self.errorModel.unset(id);
            }
          }

          if (!self.isNew() && 'id' in self.sessAttrs) {
            err['id'] = '{{ _('The ID can not be changed.') }}';;
            errmsg = err['id'];
          } else {
            self.errorModel.unset('id');
          }
          check_for_empty('name', '{{ _('Name must be specified.') }}');

          check_for_empty(
            'host', '{{ _('Hostname or address must be specified.') }}'
          );
          check_for_empty(
            'db', '{{ _('Maintenance database must be specified.') }}'
          );
          check_for_empty(
            'username', '{{ _('Username must be specified.') }}'
          );
          this.errorModel.set(err);

          if (_.size(err)) {
            return errmsg;
          }

          return null;
        },
        isConnected: function(model) {
          return model.get('connected');
        }
      }),
      connection_lost: function(i, resp) {
        if (pgBrowser.tree) {
          var t = pgBrowser.tree,
              info = i && this.getTreeNodeHierarchy(i),
              s = null,
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
                    {item: _i, data: _d}, false
                  );
                }
              };

              // Listen for the server connection cancellation event
              pgBrowser.Events.on(
                'pgadmin:server:connect:cancelled', disconnect
              );
              alertify.confirm(
                '{{ _('Connection lost') }}',
                '{{ _('Would you like to reconnect to the database?') }}',
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
      }
    });
    function connect_to_server(obj, data, tree, item, reconnect) {
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

            alertify.pgNotifier('error', xhr, error, function(msg) {
              setTimeout(function() {
                alertify.dlgServerPass(
                  '{{ _('Connect to Server') }}',
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

              alertify.success(res.info);
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
      if (!alertify.dlgServerPass) {
        alertify.dialog('dlgServerPass', function factory() {
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
                buttons:[
                  {
                    text: "{{ _('OK') }}", key: 13, className: "btn btn-primary"
                  },
                  {
                    text: "{{ _('Cancel') }}", className: "btn btn-danger"
                  }
                ],
                focus: { element: '#password', select: true },
                options: {
                  modal: 0, resizable: false, maximizable: false, pinnable: false
                }
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

              if (closeEvent.button.text == "{{ _('OK') }}") {

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
                  success: function(res) {
                    return _onSuccess(
                      res, _node, _data, _tree, _item, _status
                      );
                  },
                  error: function(xhr, status, error) {
                    return _onFailure(
                      xhr, status, error, _node, _data, _tree, _item, _status
                      );
                  }
                });
              } else {
                this.onCancel && typeof(this.onCancel) == 'function' &&
                  this.onCancel(_tree, _item, _data, _status);
              }
            }
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
      url = obj.generate_url(item, "connect", data, true);
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
    }

    /* Send PING to indicate that session is alive */
    function server_status(server_id)
    {
      url = "/ping";
      $.post(url)
      .done(function(data) { return true})
      .fail(function(xhr, status, error) { return false})
    }
  }

  return pgBrowser.Nodes['server'];
});
