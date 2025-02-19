/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeListById } from '../../../../static/js/node_ajax';
import ServerSchema from './server.ui';
import { showServerPassword, showChangeServerPassword, showNamedRestorePoint } from '../../../../../static/js/Dialogs/index';
import _ from 'lodash';
import getApiInstance, { parseApiError } from '../../../../../static/js/api_instance';

define('pgadmin.node.server', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.user_management.current_user',
  'pgadmin.authenticate.kerberos',
], function(
  gettext, url_for, pgAdmin, pgBrowser,
  current_user, Kerberos,
) {

  if (!pgBrowser.Nodes['server']) {
    pgAdmin.Browser.Nodes['server'] = pgAdmin.Browser.Node.extend({
      parent_type: 'server_group',
      type: 'server',
      dialogHelp: url_for('help.static', {'filename': 'server_dialog.html'}),
      label: gettext('Server'),
      width: pgBrowser.stdW.md + 'px',
      canDrop: function(node){
        let serverOwner = node.user_id;
        return !(serverOwner != current_user.id && !_.isUndefined(serverOwner));
      },
      dropAsRemove: true,
      dropPriority: 5,
      hasStatistics: true,
      hasCollectiveStatistics: true,
      can_expand: function(d) {
        return d?.connected;
      },
      title: function(d, action) {
        if(action == 'create') {
          return gettext('Register - %s', this.label);
        } else if (action == 'copy') {
          return gettext('Copy Server - %s', d.label);
        }
        return d._label??'';
      },
      copy: function(d) {
        // This function serves the purpose of facilitating modifications
        // during the server copying process.

        // Changing the name of the server to "Copy of <existing name>"
        d.name = gettext('Copy of %s', d.name);
        // If existing server is a shared server from another user then
        // copy this server as a local server for the current user.
        if (d?.shared && d.user_id != current_user?.id) {
          d.gid = null;
          d.user_id = current_user?.id;
          d.shared = false;
          d.server_owner = null;
          d.shared_username = null;
        }
        return d;
      },
      Init: function() {
        /* Avoid multiple registration of same menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menu_category({
          name: 'server', label: gettext('Server'), priority: 1
        });

        pgBrowser.add_menus([{
          name: 'create_server_on_sg', node: 'server_group', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'register', priority: 1, label: gettext('Server...'),
          data: {action: 'create'}, enable: 'canCreate',
        },{
          name: 'disconnect_all_servers', node: 'server_group', module: this,
          applies: ['object','context'], callback: 'disconnect_all_servers',
          priority: 5, label: gettext('Disconnect from all servers'),
          data:{action: 'disconnect_all'}, enable: 'can_disconnect_all'
        },{
          name: 'create_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'register', priority: 3, label: gettext('Server...'),
          data: {action: 'create'}, enable: 'canCreate',
        },{
          name: 'connect_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'connect_server',
          category: 'connect', priority: 4, label: gettext('Connect Server'),
          enable : 'is_not_connected',data: {
            data_disabled: gettext('Database server is already connected.'),
          },
        },{
          name: 'disconnect_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'disconnect_server',
          category: 'drop', priority: 5, label: gettext('Disconnect from server'),
          enable : 'is_connected',data: {
            data_disabled: gettext('Database server is already disconnected.'),
          },
        },
        {
          name: 'reload_configuration', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'reload_configuration',
          category: 'reload', priority: 10, label: gettext('Reload Configuration'),
          enable : 'enable_reload_config',data: {
            data_disabled: gettext('Please select a server from the object explorer to reload the configuration files.'),
          },
        },{
          name: 'restore_point', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'restore_point',
          category: 'restore', priority: 7, label: gettext('Add Named Restore Point...'),
          enable : 'is_applicable',data: {
            data_disabled: gettext('Please select any server from the object explorer to Add Named Restore Point.'),
          },
        },{
          name: 'change_password', node: 'server', module: this,
          applies: ['object'], callback: 'change_password',
          label: gettext('Change Password...'), priority: 10,
          enable : 'is_connected',data: {
            data_disabled: gettext('Please connect server to enable change password.'),
          },
        },{
          name: 'wal_replay_pause', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'pause_wal_replay',
          category: 'wal_replay_pause', priority: 8, label: gettext('Pause Replay of WAL'),
          enable : 'wal_pause_enabled',data: {
            data_disabled: gettext('Please select a connected database as a Super user and run in Recovery mode to Pause Replay of WAL.'),
          },
        },{
          name: 'wal_replay_resume', node: 'server', module: this,
          applies: ['tools', 'context'], callback: 'resume_wal_replay',
          category: 'wal_replay_resume', priority: 9, label: gettext('Resume Replay of WAL'),
          enable : 'wal_resume_enabled',data: {
            data_disabled: gettext('Please select a connected database as a Super user and run in Recovery mode to Resume Replay of WAL.'),
          },
        },{
          name: 'clear_saved_password', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'clear_saved_password',
          label: gettext('Clear Saved Password'),
          priority: 11,
          enable: function(node) {
            return (node?._type === 'server' &&
              node?.is_password_saved);
          },
        },{
          name: 'clear_sshtunnel_password', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'clear_sshtunnel_password',
          label: gettext('Clear SSH Tunnel Password'),
          priority: 12,
          enable: function(node) {
            return (node?._type === 'server' &&
              node?.is_tunnel_password_saved);
          },
          data: {
            data_disabled: gettext('SSH Tunnel password is not saved for selected server.'),
          },
        }, {
          name: 'copy_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          label: gettext('Copy Server...'), data: {action: 'copy'},
          priority: 4,
        }]);

        _.bindAll(this, 'connection_lost');
        pgBrowser.Events.on(
          'pgadmin:server:connection:lost', this.connection_lost
        );
      },
      is_not_connected: function(node) {
        return (node && !node.connected);
      },
      canCreate: function(node){
        let serverOwner = node.user_id;
        return (serverOwner == current_user.id || _.isUndefined(serverOwner));

      },
      is_connected: function(node) {
        return node?.connected;
      },
      enable_reload_config: function(node) {
        // Must be connected & is Super user
        return (node?._type == 'server' &&
          node?.connected && node?.user?.is_superuser);
      },
      is_applicable: function(node) {
        // Must be connected & super user & not in recovery mode
        return (node?._type == 'server' &&
          node?.connected && node?.user?.is_superuser
            && !(node.in_recovery??true));
      },
      wal_pause_enabled: function(node) {
        // Must be connected & is Super user & in Recovery mode
        return (node?._type == 'server' &&
          node?.connected && node?.user?.is_superuser
            && node?.in_recovery && !(node?.wal_pause??true));
      },
      wal_resume_enabled: function(node) {
        // Must be connected & is Super user & in Recovery mode
        return (node?._type == 'server' &&
          node?.connected && node?.user?.is_superuser
            && node?.in_recovery && node?.wal_pause);
      },
      can_disconnect_all: function(node, item) {
        return _.some(item.children, (child) => pgAdmin.Browser.tree.getData(child).connected);
      },
      callbacks: {
        /* Connect the server */
        connect_server: function(args){
          let input = args || {},
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
        disconnect_server: function(args) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = 'item' in input ? input.item : t.selected(),
            d = i ? t.itemData(i) : undefined;
          if (d) {
            disconnect_from_server(obj, d, t, i, true);
          }
          return false;
        },
        disconnect_all_servers: function(args, item) {
          let children = item.children ?? [],
            obj = this,
            t = pgBrowser.tree;
          if (children) {
            pgAdmin.Browser.notifier.confirm(
              gettext('Disconnect from all servers'),
              gettext('Are you sure you want to disconnect from all servers?'),
              function() {
                _.forEach(children, function(child) {
                  let data = pgAdmin.Browser.tree.getData(child);
                  if (data.connected) {
                    disconnect_from_server(obj, data, t, child, false);
                  }
                });
                t.deselect(item);
                setTimeout(() => {
                  t.select(item);
                }, 100);
              },
              function() { return true;},
              gettext('Disconnect'),
              gettext('Cancel'),
              'disconnect'
            );
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

          // Check the database server against supported version.
          checkSupportedVersion(data.version);

          if(data.was_connected) {
            fetch_connection_status(this, data, pgBrowser.tree, item);
          }
          return true;
        },
        /* Reload configuration */
        reload_configuration: function(args){
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i ? t.itemData(i) : undefined;

          if (d) {
            pgAdmin.Browser.notifier.confirm(
              gettext('Reload server configuration'),
              gettext('Are you sure you want to reload the server configuration on %s?', d.label),
              function() {
                getApiInstance().get(
                  obj.generate_url(i, 'reload', d, true),
                ).then(({data: res})=> {
                  if (res.data.status) {
                    pgAdmin.Browser.notifier.success(res.data.result);
                  }
                  else {
                    pgAdmin.Browser.notifier.error(res.data.result);
                  }
                }).catch(function(error) {
                  pgAdmin.Browser.notifier.pgRespErrorNotify(error);
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
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          showNamedRestorePoint(gettext('Restore point name'), d, obj, i);
        },

        /* Change password */
        change_password: function(args){
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined,
            is_pgpass_file_used = false,
            check_pgpass_url = obj.generate_url(i, 'check_pgpass', d, true);

          if (d) {
            // Call to check if server is using pgpass file or not
            getApiInstance().get(
              check_pgpass_url
            ).then(({data: res})=> {
              if (res.success && res.data.is_pgpass) {
                is_pgpass_file_used = true;
              }
              showChangeServerPassword(gettext('Change Password'), d, obj, i, is_pgpass_file_used);
            }).catch(function(error) {
              pgAdmin.Browser.notifier.pgRespErrorNotify(error);
            });
          }

          return false;
        },

        on_done: function(res, t, i) {
          if (res.success == 1) {
            pgAdmin.Browser.notifier.success(res.info);
            t.itemData(i).wal_pause=res.data.wal_pause;
            t.deselect(i);
            // Fetch updated data from server
            setTimeout(function() {
              t.select(i);
            }, 10);
          }
        },

        /* Pause WAL Replay */
        pause_wal_replay: function(args) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          getApiInstance().delete(
            obj.generate_url(i, 'wal_replay' , d, true)
          ).then(({data: res})=> {
            obj.callbacks.on_done(res, t, i);
          }).catch(function(error) {
            pgAdmin.Browser.notifier.pgRespErrorNotify(error);
            t.unload(i);
          });
        },

        /* Resume WAL Replay */
        resume_wal_replay: function(args) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          getApiInstance().put(
            obj.generate_url(i, 'wal_replay' , d, true)
          ).then(({data: res})=> {
            obj.callbacks.on_done(res, t, i);
          }).catch(function(error) {
            pgAdmin.Browser.notifier.pgRespErrorNotify(error);
            t.unload(i);
          });
        },

        /* Cleat saved database server password */
        clear_saved_password: function(args){
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (d) {
            pgAdmin.Browser.notifier.confirm(
              gettext('Clear saved password'),
              gettext('Are you sure you want to clear the saved password for server %s?', d.label),
              function() {
                getApiInstance().put(
                  obj.generate_url(i, 'clear_saved_password' , d, true)
                ).then(({data: res})=> {
                  if (res.success == 1) {
                    pgAdmin.Browser.notifier.success(res.info);
                    t.itemData(i).is_password_saved=res.data.is_password_saved;
                    t.deselect(i);
                    setTimeout(function() {
                      t.select(i);
                    });
                  }
                  else {
                    pgAdmin.Browser.notifier.error(res.info);
                  }
                }).catch(function(error) {
                  pgAdmin.Browser.notifier.pgRespErrorNotify(error);
                });
              },
              function() { return true; }
            );
          }

          return false;
        },

        /* Reset stored ssh tunnel  password */
        clear_sshtunnel_password: function(args){
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (d) {
            pgAdmin.Browser.notifier.confirm(
              gettext('Clear SSH Tunnel password'),
              gettext('Are you sure you want to clear the saved password of SSH Tunnel for server %s?', d.label),
              function() {
                getApiInstance().put(
                  obj.generate_url(i, 'clear_sshtunnel_password' , d, true)
                ).then(({data: res})=> {
                  if (res.success == 1) {
                    pgAdmin.Browser.notifier.success(res.info);
                    t.itemData(i).is_tunnel_password_saved=res.data.is_tunnel_password_saved;
                  }
                  else {
                    pgAdmin.Browser.notifier.error(res.info);
                  }
                }).catch(function(error) {
                  pgAdmin.Browser.notifier.pgRespErrorNotify(error);
                });
              },
              function() { return true; }
            );
          }

          return false;
        },
        /* Open psql tool for server*/
        server_psql_tool: function(args) {
          let input = args || {},
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;
          pgBrowser.psql.psql_tool(d, i, true);
        }
      },
      getSchema: (treeNodeInfo, itemNodeData)=>{
        return new ServerSchema(
          getNodeListById(pgBrowser.Nodes['server_group'], treeNodeInfo, itemNodeData, {},
          // Filter out shared servers group, it should not be visible.
            (server)=> !server.is_shared),
          itemNodeData.user_id,
          {
            gid: treeNodeInfo['server_group']._id,
          }
        );
      },
      connection_lost: function(i, resp) {
        if (pgBrowser.tree) {
          let t = pgBrowser.tree,
            d = i && t.itemData(i),
            self = this;

          while (d?._type != 'server') {
            i = t.parent(i);
            d = i && t.itemData(i);
          }

          if (i && d?._type == 'server') {
            if (_.isUndefined(d.is_connecting) || !d.is_connecting) {
              d.is_connecting = true;

              let disconnect = function(_sid) {
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
              pgAdmin.Browser.notifier.confirm(
                gettext('Connection lost'),
                gettext('Would you like to reconnect to the database?'),
                function() {
                  connect_to_server(self, d, t, i, true);
                },
                function() {
                  d.is_connecting = false;
                  t.unload(i);
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

    let checkSupportedVersion = function (version, info) {
      if (!_.isUndefined(version) && !_.isNull(version) && version < 100000) {
        pgAdmin.Browser.notifier.warning(gettext('You have connected to a server version that is older ' +
          'than is supported by pgAdmin. This may cause pgAdmin to break in strange and ' +
          'unpredictable ways. Or a plague of frogs. Either way, you have been warned!') +
          '<br /><br />' + gettext('Server connected'), null);
      } else if (!_.isUndefined(info) && !_.isNull(info)) {
        pgAdmin.Browser.notifier.success(info);
      }
    };

    let connect_to_server = function(obj, data, tree, item, reconnect) {
    // Open properties dialog in edit mode
      let server_url = obj.generate_url(item, 'obj', data, true);
      // Fetch the updated data
      getApiInstance().get(server_url)
        .then(({data: res})=>{
          if (res.shared && _.isNull(res.username) && data.user_id != current_user.id) {
            if (!res.service) {
              pgAdmin.Browser.Node.callbacks.show_obj_properties.call(
                pgAdmin.Browser.Nodes[tree.itemData(item)._type], {action: 'edit', 'item': item}
              );
              data.is_connecting = false;
              tree.unload(item);
              tree.addIcon(item, {icon: 'icon-shared-server-not-connected'});
              pgAdmin.Browser.notifier.info('Please enter the server details to connect to the server. This server is a shared server.');
            } else {
              data.is_connecting = false;
              tree.unload(item);
              tree.addIcon(item, {icon: 'icon-shared-server-not-connected'});
            }
          }
          else if (res.cloud_status == -1) {
            pgAdmin.Browser.BgProcessManager.recheckCloudServer(data._id);
          }
        })
        .then(()=>{
          data.is_connecting = false;
        });

      let wasConnected = reconnect || data.connected,
        onFailure = function(
          error, errormsg, _node, _data, _tree, _item, _wasConnected
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
          if (error.response?.status != 200 && error.response?.request?.responseText?.search('Ticket expired') !== -1) {
            tree.addIcon(_item, {icon: 'icon-server-connecting'});
            let fetchTicket = Kerberos.fetch_ticket();
            fetchTicket.then(
              function() {
                connect_to_server(_node, _data, _tree, _item, _wasConnected);
              },
              function() {
                tree.addIcon(_item, {icon: 'icon-server-not-connected'});
                pgAdmin.Browser.notifier.pgNotifier('error', error, 'Connection error', gettext('Connect to server.'));
              }
            );
          } else {
            pgAdmin.Browser.notifier.pgNotifier('error', error, errormsg, function(msg) {
              setTimeout(function() {
                if (msg == 'CRYPTKEY_SET') {
                  connect_to_server(_node, _data, _tree, _item, _wasConnected);
                } else if (msg != 'CRYPTKEY_NOT_SET') {
                  showServerPassword(
                    gettext('Connect to Server'),
                    msg, _node, _data, _tree, _item, _wasConnected, onSuccess,
                    onFailure, onCancel
                  );
                }
              }, 100);
            });
          }
        },
        onSuccess = function(res, node, _data, _tree, _item, _wasConnected) {
          if (res?.data) {
            if (typeof res.data.icon == 'string') {
              _tree.removeIcon(_item);
              _data.icon = res.data.icon;
              _tree.addIcon(_item, {icon: _data.icon});
            }

            _.extend(_data, res.data);
            _data.is_connecting = false;

            let serverInfo = pgBrowser.serverInfo =
              pgBrowser.serverInfo || {};
            serverInfo[_data._id] = _.extend({}, _data);

            // Check the database server against supported version.
            checkSupportedVersion(_data.version, res.info);

            // Generate the event that server is connected
            pgBrowser.Events.trigger(
              'pgadmin:server:connected', _data._id, _item, _data
            );
            // Generate the event that database is connected
            pgBrowser.Events.trigger(
              'pgadmin:database:connected', _item, _data
            );

            // Load dashboard
            pgBrowser.Events.trigger('pgadmin-browser:tree:selected', _item, _data, node);

            /* Call enable/disable menu function after database is connected.
             To make sure all the menus for database is in the right state */
            pgBrowser.enable_disable_menus(_item);

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

      let onCancel = function(_tree, _item, _data, _status) {
        _data.is_connecting = false;
        _tree.unload(_item);
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
      if(data.is_connecting || data.cloud_status == -1) {
        return;
      }
      data.is_connecting = true;
      tree.setLeaf(item);
      tree.removeIcon(item);
      tree.addIcon(item, {icon: 'icon-server-connecting'});
      let url = obj.generate_url(item, 'connect', data, true);
      getApiInstance().post(url)
        .then(({data: res})=>{
          if (res.success == 1) {
            return onSuccess(
              res, obj, data, tree, item, wasConnected
            );
          }
        })
        .catch((error)=>{
          return onFailure(
            error, parseApiError(error), obj, data, tree, item, wasConnected
          );
        })
        .then(()=>{
          data.is_connecting = false;
        });
    };
    let fetch_connection_status = function(obj, data, tree, item) {
      let url = obj.generate_url(item, 'connect', data, true);

      tree.setLeaf(item);
      tree.removeIcon(item);
      tree.addIcon(item, {icon: 'icon-server-connecting'});

      getApiInstance().get(url)
        .then(({data: res})=>{
          tree.setInode(item);
          if (res?.data) {
            if (typeof res.data.icon == 'string') {
              tree.removeIcon(item);
              data.icon = res.data.icon;
              tree.addIcon(item, {icon: data.icon});
            }
            _.extend(data, res.data);

            let serverInfo = pgBrowser.serverInfo = pgBrowser.serverInfo || {};
            serverInfo[data._id] = _.extend({}, data);

            if(data.errmsg) {
              pgAdmin.Browser.notifier.error(data.errmsg);
            }
            // Generate the event that server is connected
            pgBrowser.Events.trigger(
              'pgadmin:server:connected', data._id, item, data
            );
          }
        })
        .catch((error)=>{
          tree.setInode(item);
          if (data.shared && pgAdmin.server_mode == 'True'){
            tree.addIcon(item, {icon: 'icon-shared-server-not-connected'});
          }else{
            tree.addIcon(item, {icon: 'icon-server-not-connected'});
          }
          pgAdmin.Browser.notifier.pgRespErrorNotify(error);
        });
    };
    let disconnect_from_server = async function(obj, data, tree, item, notify=false) {
      let d = data,
        i = item,
        t = tree,
        label = data.label;

      let disconnect = function() {
        d.label = `<span class='text-muted'>[Disconnecting...]</span> ${label}`;
        t.setLabel(i,{label:d.label});
        t.close(i);
        getApiInstance().delete(
          obj.generate_url(i, 'connect', d, true),
        ).then(({data: res})=> {
          if (res.success == 1) {
            if (notify) {
              pgAdmin.Browser.notifier.success(res.info);
            } else {
              pgAdmin.Browser.notifier.success(`${label} - ${res.info}`);
            }
            d = t.itemData(i);
            t.removeIcon(i);
            d.connected = false;
            d.label = label;
            t.setLabel(i, {label});
            // Update server tree node data after server diconnected.
            t.update(i,d);
            // Generate the event that server is disconnected
            pgBrowser.Events.trigger(
              'pgadmin:server:disconnect',
              {item: i, data: d}, false
            );
            if (d.shared && pgAdmin.server_mode == 'True'){
              d.icon = 'icon-shared-server-not-connected';
            }else{
              d.icon = 'icon-server-not-connected';
            }
            t.addIcon(i, {icon: d.icon});
            obj.callbacks.refresh.apply(obj, [null, i]);
            setTimeout(() => {
              t.close(i);
            }, 10);
            if (pgBrowser.serverInfo && d._id in pgBrowser.serverInfo) {
              delete pgBrowser.serverInfo[d._id];
            }
            else {
              try {
                pgAdmin.Browser.notifier.error(res.errormsg);
              } catch (e) {
                console.warn(e.stack || e);
              }
              t.setLabel(i, {label});
              t.unload(i);
            }
          }
        }).catch(function(error) {
          pgAdmin.Browser.notifier.pgRespErrorNotify(error);
          t.setLabel(i, {label});
          t.unload(i);
        });
      };

      if (notify) {
        pgAdmin.Browser.notifier.confirm(
          gettext('Disconnect from server'),
          gettext('Are you sure you want to disconnect from the server <b>%s</b>?', label),
          function() { disconnect(); },
          function() { return true;},
          gettext('Disconnect'),
          gettext('Cancel'),
          'disconnect'
        );
      } else {
        disconnect();
      }
    };
  }

  return pgBrowser.Nodes['server'];
});
