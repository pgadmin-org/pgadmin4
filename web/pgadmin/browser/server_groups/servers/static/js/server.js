/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeListById } from '../../../../static/js/node_ajax';
import ServerSchema from './server.ui';
import Notify from '../../../../../static/js/helpers/Notifier';

define('pgadmin.node.server', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.user_management.current_user',
  'pgadmin.alertifyjs', 'pgadmin.backform',
  'pgadmin.authenticate.kerberos',
  'pgadmin.browser.server.privilege',
], function(
  gettext, url_for, $, _, Backbone, pgAdmin, pgBrowser,
  current_user, Alertify, Backform, Kerberos,
) {

  if (!pgBrowser.Nodes['server']) {
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
        id: 'label', label: gettext('Security label'),
        type: 'text', editable: true,
        cellHeaderClasses:'override_label_class_font_size',
      }],
      validate: function() {
        this.errorModel.clear();
        if (_.isUndefined(this.get('label')) ||
          _.isNull(this.get('label')) ||
            String(this.get('label')).replace(/^\s+|\s+$/g, '') == '') {
          var errmsg = gettext('Security label must be specified.');
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
      canDrop: function(node){
        var serverOwner = node.user_id;
        if (serverOwner != current_user.id && !_.isUndefined(serverOwner))
          return false;
        return true;
      },
      dropAsRemove: true,
      dropPriority: 5,
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
          data: {action: 'create'}, icon: 'wcTabIcon icon-server', enable: 'canCreate',
        },{
          name: 'create_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 3, label: gettext('Server...'),
          data: {action: 'create'}, icon: 'wcTabIcon icon-server', enable: 'canCreate',
        },{
          name: 'connect_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'connect_server',
          category: 'connect', priority: 4, label: gettext('Connect Server'),
          icon: 'fa fa-link', enable : 'is_not_connected',data: {
            data_disabled: gettext('Database is already connected.'),
          },
        },{
          name: 'disconnect_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'disconnect_server',
          category: 'drop', priority: 5, label: gettext('Disconnect Server'),
          icon: 'fa fa-unlink', enable : 'is_connected',data: {
            data_disabled: gettext('Database is already disconnected.'),
          },
        },
        {
          name: 'reload_configuration', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'reload_configuration',
          category: 'reload', priority: 6, label: gettext('Reload Configuration'),
          icon: 'fa fa-redo-alt', enable : 'enable_reload_config',data: {
            data_disabled: gettext('Please select a server from the browser tree to reload the configuration files.'),
          },
        },{
          name: 'restore_point', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'restore_point',
          category: 'restore', priority: 9, label: gettext('Add Named Restore Point...'),
          icon: 'fa fa-anchor', enable : 'is_applicable',data: {
            data_disabled: gettext('Please select any server from the browser tree to Add Named Restore Point.'),
          },
        },{
          name: 'change_password', node: 'server', module: this,
          applies: ['object'], callback: 'change_password',
          label: gettext('Change Password...'), priority: 10,
          icon: 'fa fa-lock', enable : 'is_connected',data: {
            data_disabled: gettext('Please connect server to enable change password.'),
          },
        },{
          name: 'wal_replay_pause', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'pause_wal_replay',
          category: 'wal_replay_pause', priority: 7, label: gettext('Pause Replay of WAL'),
          icon: 'fa fa-pause-circle', enable : 'wal_pause_enabled',data: {
            data_disabled: gettext('Please select a connected database as a Super user and run in Recovery mode to Pause Replay of WAL.'),
          },
        },{
          name: 'wal_replay_resume', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'resume_wal_replay',
          category: 'wal_replay_resume', priority: 8, label: gettext('Resume Replay of WAL'),
          icon: 'fa fa-play-circle', enable : 'wal_resume_enabled',data: {
            data_disabled: gettext('Please select a connected database as a Super user and run in Recovery mode to Resume Replay of WAL.'),
          },
        },{
          name: 'clear_saved_password', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'clear_saved_password',
          label: gettext('Clear Saved Password'), icon: 'fa fa-eraser',
          priority: 11,
          enable: function(node) {
            if (node && node._type === 'server' &&
              node.is_password_saved) {
              return true;
            }
            return false;
          },
        },{
          name: 'clear_sshtunnel_password', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'clear_sshtunnel_password',
          label: gettext('Clear SSH Tunnel Password'), icon: 'fa fa-eraser',
          priority: 12,
          enable: function(node) {
            if (node && node._type === 'server' &&
              node.is_tunnel_password_saved) {
              return true;
            }
            return false;
          },
          data: {
            data_disabled: gettext('SSH Tunnel password is not saved for selected server.'),
          },
        }]);

        _.bindAll(this, 'connection_lost');
        pgBrowser.Events.on(
          'pgadmin:server:connection:lost', this.connection_lost
        );
      },
      is_not_connected: function(node) {
        return (node && node.connected != true);
      },
      canCreate: function(node){
        var serverOwner = node.user_id;
        if (serverOwner == current_user.id || _.isUndefined(serverOwner))
          return true;
        return false;

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
            d = i  ? t.itemData(i) : undefined;

          if (d) {
            connect_to_server(obj, d, t, i, false);
          }
          return false;
        },
        /* Disconnect the server */
        disconnect_server: function(args, notify) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = 'item' in input ? input.item : t.selected(),
            d = i ? t.itemData(i) : undefined;

          if (d) {
            notify = notify || _.isUndefined(notify) || _.isNull(notify);

            var disconnect = function() {
              $.ajax({
                url: obj.generate_url(i, 'connect', d, true),
                type:'DELETE',
              })
                .done(function(res) {
                  if (res.success == 1) {
                    Notify.success(res.info);
                    d = t.itemData(i);
                    t.removeIcon(i);
                    d.connected = false;
                    if (d.shared && pgAdmin.server_mode == 'True'){
                      d.icon = 'icon-shared-server-not-connected';
                    }else{
                      d.icon = 'icon-server-not-connected';
                    }
                    t.addIcon(i, {icon: d.icon});
                    obj.callbacks.refresh.apply(obj, [null, i]);
                    t.close(i);
                    if (pgBrowser.serverInfo && d._id in pgBrowser.serverInfo) {
                      delete pgBrowser.serverInfo[d._id];
                    }
                    else {
                      try {
                        Notify.error(res.errormsg);
                      } catch (e) {
                        console.warn(e.stack || e);
                      }
                      t.unload(i);
                    }
                  }})
                .fail(function(xhr, status, error) {
                  Notify.pgRespErrorNotify(xhr, error);
                  t.unload(i);
                });
            };

            if (notify) {
              Notify.confirm(
                gettext('Disconnect server'),
                gettext('Are you sure you want to disconnect the server %s?', d.label),
                function() { disconnect(); },
                function() { return true;},
              );
            } else {
              disconnect();
            }
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

          if(data.was_connected) {
            fetch_connection_status(this, data, pgBrowser.tree, item);
          }
          return true;
        },
        /* Reload configuration */
        reload_configuration: function(args){
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i ? t.itemData(i) : undefined;

          if (d) {
            Notify.confirm(
              gettext('Reload server configuration'),
              gettext('Are you sure you want to reload the server configuration on %s?', d.label),
              function() {
                $.ajax({
                  url: obj.generate_url(i, 'reload', d, true),
                  method:'GET',
                })
                  .done(function(res) {
                    if (res.data.status) {
                      Notify.success(res.data.result);
                    }
                    else {
                      Notify.error(res.data.result);
                    }
                  })
                  .fail(function(xhr, status, error) {
                    Notify.pgRespErrorNotify(xhr, error);
                    t.unload(i);
                  });
              },
              function() { return true; },
            );
          }

          return false;
        },
        /* Add restore point */
        restore_point: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

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
                    Notify.success(res.data.result, 10000);
                  })
                  .fail(function(xhr, status, error) {
                    Notify.pgRespErrorNotify(xhr, error);
                    t.unload(i);
                  });
              } else {
                evt.cancel = true;
                Notify.error(gettext('Please enter a valid name.'), 10000);
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
            d = i  ? t.itemData(i) : undefined,
            url = obj.generate_url(i, 'change_password', d, true),
            is_pgpass_file_used = false,
            check_pgpass_url = obj.generate_url(i, 'check_pgpass', d, true);

          if (d) {
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
                  type: 'text', readonly: true, control: 'input',
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
                    var title = gettext('Change Password');
                    this.set('title', title);
                    this.user_name = params.user.name;
                  },
                  setup:function() {
                    return {
                      buttons: [{
                        text: gettext('Cancel'), key: 27,
                        className: 'btn btn-secondary fa fa-times pg-alertify-button', attrs: {name: 'cancel'},
                      },{
                        text: gettext('OK'), key: 13, className: 'btn btn-primary fa fa-check pg-alertify-button',
                        attrs: {name:'submit'},
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
                    this.__internal.buttons[1].element.disabled = true;

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
                        self.__internal.buttons[1].element.disabled = true;
                      } else if (newPassword != confirmPassword) {
                        self.__internal.buttons[1].element.disabled = true;

                        this.errorTimeout && clearTimeout(this.errorTimeout);
                        this.errorTimeout = setTimeout(function() {
                          that.errorModel.set('confirmPassword', gettext('Passwords do not match.'));
                        } ,400);
                      }else {
                        that.errorModel.clear();
                        self.__internal.buttons[1].element.disabled = false;
                      }
                    });
                  },
                  // Callback functions when click on the buttons of the Alertify dialogs
                  callback: function(e) {
                    if (e.button.element.name == 'submit') {
                      var self = this,
                        alertArgs =  this.view.model.toJSON();

                      e.cancel = true;

                      $.ajax({
                        url: url,
                        method:'POST',
                        data:{'data': JSON.stringify(alertArgs) },
                      })
                        .done(function(res) {
                          if (res.success) {
                          // Notify user to update pgpass file
                            if(is_pgpass_file_used) {
                              Notify.alert(
                                gettext('Change Password'),
                                gettext('Please make sure to disconnect the server'
                                + ' and update the new password in the pgpass file'
                                  + ' before performing any other operation')
                              );
                            }

                            Notify.success(res.info);
                            self.close();
                          } else {
                            Notify.error(res.errormsg);
                          }
                        })
                        .fail(function(xhr, status, error) {
                          Notify.pgRespErrorNotify(xhr, error);
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
                Notify.pgRespErrorNotify(xhr, error);
              });
          }

          return false;
        },

        /* Pause WAL Replay */
        pause_wal_replay: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          $.ajax({
            url: obj.generate_url(i, 'wal_replay' , d, true),
            type:'DELETE',
            dataType: 'json',
          })
            .done(function(res) {
              if (res.success == 1) {
                Notify.success(res.info);
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
              Notify.pgRespErrorNotify(xhr, error);
              t.unload(i);
            });
        },

        /* Resume WAL Replay */
        resume_wal_replay: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          $.ajax({
            url: obj.generate_url(i, 'wal_replay' , d, true),
            type:'PUT',
            dataType: 'json',
          })
            .done(function(res) {
              if (res.success == 1) {
                Notify.success(res.info);
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
              Notify.pgRespErrorNotify(xhr, error);
              t.unload(i);
            });
        },

        /* Cleat saved database server password */
        clear_saved_password: function(args){
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (d) {
            Notify.confirm(
              gettext('Clear saved password'),
              gettext('Are you sure you want to clear the saved password for server %s?', d.label),
              function() {
                $.ajax({
                  url: obj.generate_url(i, 'clear_saved_password', d, true),
                  method:'PUT',
                })
                  .done(function(res) {
                    if (res.success == 1) {
                      Notify.success(res.info);
                      t.itemData(i).is_password_saved=res.data.is_password_saved;
                    }
                    else {
                      Notify.error(res.info);
                    }
                  })
                  .fail(function(xhr, status, error) {
                    Notify.pgRespErrorNotify(xhr, error);
                  });
              },
              function() { return true; }
            );
          }

          return false;
        },

        /* Reset stored ssh tunnel  password */
        clear_sshtunnel_password: function(args){
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (d) {
            Notify.confirm(
              gettext('Clear SSH Tunnel password'),
              gettext('Are you sure you want to clear the saved password of SSH Tunnel for server %s?', d.label),
              function() {
                $.ajax({
                  url: obj.generate_url(i, 'clear_sshtunnel_password', d, true),
                  method:'PUT',
                })
                  .done(function(res) {
                    if (res.success == 1) {
                      Notify.success(res.info);
                      t.itemData(i).is_tunnel_password_saved=res.data.is_tunnel_password_saved;
                    }
                    else {
                      Notify.error(res.info);
                    }
                  })
                  .fail(function(xhr, status, error) {
                    Notify.pgRespErrorNotify(xhr, error);
                  });
              },
              function() { return true; }
            );
          }

          return false;
        },
        /* Open psql tool for server*/
        server_psql_tool: function(args) {
          var input = args || {},
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;
          pgBrowser.psql.psql_tool(d, i, true);
        }
      },
      getSchema: (treeNodeInfo, itemNodeData)=>{
        let schema = new ServerSchema(
          getNodeListById(pgBrowser.Nodes['server_group'], treeNodeInfo, itemNodeData),
          itemNodeData.user_id,
          {
            gid: treeNodeInfo['server_group']._id,
          }
        );
        return schema;
      },
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
              Notify.confirm(
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
    // Open properties dialog in edit mode
      var server_url = obj.generate_url(item, 'obj', data, true);
      // Fetch the updated data
      $.get(server_url)
        .done(function(res) {
          if (res.shared && _.isNull(res.username) && data.user_id != current_user.id){
            if (!res.service){
              pgAdmin.Browser.Node.callbacks.show_obj_properties.call(
                pgAdmin.Browser.Nodes[tree.itemData(item)._type], {action: 'edit'}
              );
              data.is_connecting = false;
              tree.unload(item);
              tree.setInode(item);
              tree.addIcon(item, {icon: 'icon-shared-server-not-connected'});
              Notify.info('Please enter the server details to connect to the server. This server is a shared server.');
            }else{
              data.is_connecting = false;
              tree.unload(item);
              tree.setInode(item);
              tree.addIcon(item, {icon: 'icon-shared-server-not-connected'});
            }
          }
          return;
        }).always(function(){
          data.is_connecting = false;
        });

      var wasConnected = reconnect || data.connected,
        onFailure = function(
          xhr, status, error, _node, _data, _tree, _item, _wasConnected
        ) {
          data.connected = false;

          // It should be attempt to reconnect.
          // Let's not change the status of the tree node now.
          if (!_wasConnected) {
            tree.close(_item);
            if (_data.shared && pgAdmin.server_mode == 'True'){
              tree.addIcon(_item, {icon: 'icon-shared-server-not-connected'});
            }else{
              tree.addIcon(_item, {icon: 'icon-server-not-connected'});
            }

          }
          if (xhr.status != 200 && xhr.responseText.search('Ticket expired') !== -1) {
            tree.addIcon(_item, {icon: 'icon-server-connecting'});
            let fetchTicket = Kerberos.fetch_ticket();
            fetchTicket.then(
              function() {
                connect_to_server(_node, _data, _tree, _item, _wasConnected);
              },
              function() {
                tree.addIcon(_item, {icon: 'icon-server-not-connected'});
                Notify.pgNotifier('Connection error', xhr, gettext('Connect to server.'));
              }
            );
          } else {
            Notify.pgNotifier('error', xhr, error, function(msg) {
              setTimeout(function() {
                if (msg == 'CRYPTKEY_SET') {
                  connect_to_server(_node, _data, _tree, _item, _wasConnected);
                } else {
                  Alertify.dlgServerPass(
                    gettext('Connect to Server'),
                    msg, _node, _data, _tree, _item, _wasConnected
                  ).resizeTo();
                }
              }, 100);
            });
          }
        },
        onSuccess = function(res, node, _data, _tree, _item, _wasConnected) {
          if (res && res.data) {
            if (typeof res.data.icon == 'string') {
              _tree.removeIcon(_item);
              _data.icon = res.data.icon;
              _tree.addIcon(_item, {icon: _data.icon});
            }

            _.extend(_data, res.data);
            _data.is_connecting = false;

            var serverInfo = pgBrowser.serverInfo =
              pgBrowser.serverInfo || {};
            serverInfo[_data._id] = _.extend({}, _data);

            if (_data.version < 90500) {
              Notify.warning(gettext('You have connected to a server version that is older ' +
                'than is supported by pgAdmin. This may cause pgAdmin to break in strange and ' +
                'unpredictable ways. Or a plague of frogs. Either way, you have been warned!') +
                '<br /><br />' +
                res.info, null);
            } else {
              Notify.success(res.info);
            }

            obj.trigger('connected', obj, _item, _data);

            // Generate the event that server is connected
            pgBrowser.Events.trigger(
              'pgadmin:server:connected', _data._id, _item, _data
            );
            // Generate the event that database is connected
            pgBrowser.Events.trigger(
              'pgadmin:database:connected', _data._id, _data.db, _item, _data
            );

            // Load dashboard
            pgBrowser.Events.trigger('pgadmin-browser:tree:selected', _item, _data, node);
            // We're not reconnecting
            if (!_wasConnected) {
              _tree.setInode(_item);

              setTimeout(function() {
                _tree.select(_item);
                _tree.open(_item);
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
              title, message, node, _data, _tree, _item,
              _status, _onSuccess, _onFailure, _onCancel
            ) {
              this.set('title', title);
              this.message = message;
              this.tree = _tree;
              this.nodeData = _data;
              this.nodeItem = _item;
              this.node= node;
              this.connected = _status;
              this.onSuccess = _onSuccess || onSuccess;
              this.onFailure = _onFailure || onFailure;
              this.onCancel = _onCancel || onCancel;
            },
            setup:function() {
              return {
                buttons:[{
                  text: gettext('Cancel'), className: 'btn btn-secondary fa fa-times pg-alertify-button',
                  key: 27,
                },{
                  text: gettext('OK'), key: 13, className: 'btn btn-primary fa fa-check pg-alertify-button',
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
        if (_data.shared && pgAdmin.server_mode == 'True'){
          _tree.addIcon(_item, {icon: 'icon-shared-server-not-connected'});
        }else{
          _tree.addIcon(_item, {icon: 'icon-server-not-connected'});
        }
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

      /* Wait till the existing request completes */
      if(data.is_connecting) {
        return;
      }
      data.is_connecting = true;
      tree.setLeaf(item);
      tree.removeIcon(item);
      tree.addIcon(item, {icon: 'icon-server-connecting'});
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
        })
        .always(function(){
          data.is_connecting = false;
        });
    };
    var fetch_connection_status = function(obj, data, tree, item) {
      var url = obj.generate_url(item, 'connect', data, true);

      tree.setLeaf(item);
      tree.removeIcon(item);
      tree.addIcon(item, {icon: 'icon-server-connecting'});
      $.get(url)
        .done(function(res) {
          tree.setInode(item);
          if (res && res.data) {
            if (typeof res.data.icon == 'string') {
              tree.removeIcon(item);
              data.icon = res.data.icon;
              tree.addIcon(item, {icon: data.icon});
            }
            _.extend(data, res.data);

            var serverInfo = pgBrowser.serverInfo = pgBrowser.serverInfo || {};
            serverInfo[data._id] = _.extend({}, data);

            if(data.errmsg) {
              Notify.error(data.errmsg);
            }
          }
        })
        .fail(function(xhr, status, error) {
          tree.setInode(item);
          if (data.shared && pgAdmin.server_mode == 'True'){
            tree.addIcon(item, {icon: 'icon-shared-server-not-connected'});
          }else{
            tree.addIcon(item, {icon: 'icon-server-not-connected'});
          }
          Notify.pgRespErrorNotify(xhr, error);
        });
    };
  }

  return pgBrowser.Nodes['server'];
});
