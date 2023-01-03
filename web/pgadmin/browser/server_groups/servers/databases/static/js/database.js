/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName } from '../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../static/js/privilege.ui';
import { getNodeVariableSchema } from '../../../static/js/variable.ui';
import DatabaseSchema from './database.ui';
import Notify from '../../../../../../static/js/helpers/Notifier';
import { showServerPassword } from '../../../../../../static/js/Dialogs/index';
import _ from 'lodash';

define('pgadmin.node.database', [
  'sources/gettext', 'sources/url_for', 'jquery',
  'sources/pgadmin', 'pgadmin.browser.utils',
  'pgadmin.authenticate.kerberos', 'pgadmin.browser.collection',
], function(gettext, url_for, $, pgAdmin, pgBrowser, Kerberos) {

  if (!pgBrowser.Nodes['coll-database']) {
    pgBrowser.Nodes['coll-database'] =
      pgBrowser.Collection.extend({
        node: 'database',
        label: gettext('Databases'),
        type: 'coll-database',
        columns: ['name', 'datowner', 'comments'],
        hasStatistics: true,
        canDrop: true,
        selectParentNodeOnDelete: true,
        canDropCascade: false,
        statsPrettifyFields: [gettext('Size'), gettext('Size of temporary files')],
      });
  }

  if (!pgBrowser.Nodes['database']) {
    pgBrowser.Nodes['database'] = pgBrowser.Node.extend({
      parent_type: 'server',
      type: 'database',
      sqlAlterHelp: 'sql-alterdatabase.html',
      sqlCreateHelp: 'sql-createdatabase.html',
      dialogHelp: url_for('help.static', {'filename': 'database_dialog.html'}),
      hasSQL: true,
      hasDepends: true,
      hasStatistics: true,
      statsPrettifyFields: [gettext('Size'), gettext('Size of temporary files')],
      canDrop: function(node) {
        return node.canDrop;
      },
      selectParentNodeOnDelete: true,
      label: gettext('Database'),
      node_image: function() {
        return 'pg-icon-database';
      },
      width: '700px',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_database_on_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Database...'),
          data: {action: 'create'},
          enable: 'can_create_database',
        },{
          name: 'create_database_on_coll', node: 'coll-database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Database...'),
          data: {action: 'create'},
          enable: 'can_create_database',
        },{
          name: 'create_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Database...'),
          data: {action: 'create'},
          enable: 'can_create_database',
        },{
          name: 'connect_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'connect_database',
          category: 'connect', priority: 4, label: gettext('Connect Database'),
          enable : 'is_not_connected', data: {
            data_disabled: gettext('Selected database is already connected.'),
          },
        },{
          name: 'disconnect_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'disconnect_database',
          category: 'drop', priority: 5, label: gettext('Disconnect from database'),
          enable : 'is_connected',data: {
            data_disabled: gettext('Selected database is already disconnected.'),
          },
        },{
          name: 'generate_erd', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'generate_erd',
          category: 'erd', priority: 5, label: gettext('ERD For Database'),
          enable: (node) => {
            return node.allowConn;
          }
        }]);

        _.bindAll(this, 'connection_lost');
        pgBrowser.Events.on(
          'pgadmin:database:connection:lost', this.connection_lost
        );
      },
      can_create_database: function(node, item) {
        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
          server = treeData['server'];

        return server.connected && server.user.can_create_db;
      },
      canCreate: function(itemData, item) {
        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
          server = treeData['server'];

        // If server is less than 10 then do not allow 'create' menu
        return server && server.version >= 100000;
      },

      is_not_connected: function(node) {
        return (node && !node.connected && node.allowConn);
      },
      is_connected: function(node) {
        return (node && node.connected && node.canDisconn);
      },
      is_psql_enabled: function(node) {
        return (node && node.connected) && pgAdmin['enable_psql'];
      },
      is_conn_allow: function(node) {
        return (node && node.allowConn);
      },
      connection_lost: function(i, resp, server_connected) {
        if (pgBrowser.tree) {
          let t = pgBrowser.tree,
            d = i && t.itemData(i),
            self = this;

          while (d && d._type != 'database') {
            i = t.parent(i);
            d = i && t.itemData(i);
          }

          if (i && d) {
            if (!d.allowConn) return false;
            if (_.isUndefined(d.is_connecting) || !d.is_connecting) {
              d.is_connecting = true;

              let disconnect = function(_i, _d) {
                if (_d._id == this._id) {
                  d.is_connecting = false;
                  pgBrowser.Events.off(
                    'pgadmin:database:connect:cancelled', disconnect
                  );
                  _i = _i && t.parent(_i);
                  _d = _i && t.itemData(_i);
                  if (_i && _d) {
                    pgBrowser.Events.trigger(
                      'pgadmin:server:disconnect',
                      {item: _i, data: _d}, false
                    );
                  }
                }
              };

              pgBrowser.Events.on(
                'pgadmin:database:connect:cancelled', disconnect
              );
              if (server_connected) {
                connect(self, d, t, i, true);
                return;
              }
              Notify.confirm(
                gettext('Connection lost'),
                gettext('Would you like to reconnect to the database?'),
                function() {
                  connect(self, d, t, i, true);
                },
                function() {
                  d.is_connecting = false;
                  t.unload(i);
                  t.setInode(i);
                  let dbIcon = d.isTemplate ? 'icon-database-template-not-connected':'icon-database-not-connected';
                  t.addIcon(i, {icon: dbIcon});
                  pgBrowser.Events.trigger(
                    'pgadmin:database:connect:cancelled', i, d, self
                  );
                });
            }
          }
        }
      },
      callbacks: {
        /* Connect the database */
        connect_database: function(args){
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (d && d.label != 'template0') {
            connect_to_database(obj, d, t, i, true);
          }
          return false;
        },
        updated: (_i, _opts)=>{
          pgBrowser.tree.refresh(_i._parent).then(() =>{
            if (_opts && _opts.success) _opts.success();
          });
        },
        /* Disconnect the database */
        disconnect_database: function(args) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (d) {
            Notify.confirm(
              gettext('Disconnect from database'),
              gettext('Are you sure you want to disconnect from database - %s?', d.label),
              function() {
                let data = d;
                $.ajax({
                  url: obj.generate_url(i, 'connect', d, true),
                  type:'DELETE',
                })
                  .done(function(res) {
                    if (res.success == 1) {
                      let prv_i = t.parent(i);
                      if(res.data.info_prefix) {
                        res.info = `${_.escape(res.data.info_prefix)} - ${res.info}`;
                      }
                      Notify.success(res.info);
                      t.removeIcon(i);
                      data.connected = false;
                      data.icon = data.isTemplate ? 'icon-database-template-not-connected':'icon-database-not-connected';

                      t.addIcon(i, {icon: data.icon});
                      t.unload(i);
                      pgBrowser.Events.trigger('pgadmin:browser:tree:update-tree-state', i);
                      setTimeout(function() {
                        t.select(prv_i);
                      }, 10);

                    } else {
                      try {
                        Notify.error(res.errormsg);
                      } catch (e) {
                        console.warn(e.stack || e);
                      }
                      t.unload(i);
                    }
                  })
                  .fail(function(xhr, status, error) {
                    Notify.pgRespErrorNotify(xhr, error);
                    t.unload(i);
                  });
              },
              function() { return true; }
            );
          }

          return false;
        },

        /* Generate the ERD */
        generate_erd: function(args) {
          let input = args || {},
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i ? t.itemData(i) : undefined;
          pgAdmin.Tools.ERD.showErdTool(d, i, true);
        },

        /* Connect the database (if not connected), before opening this node */
        beforeopen: function(item, data) {
          if(!data || data._type != 'database' || data.label == 'template0') {
            return false;
          }

          pgBrowser.tree.addIcon(item, {icon: data.icon});
          if (!data.connected && data.allowConn && !data.is_connecting) {
            data.is_connecting = true;
            connect_to_database(this, data, pgBrowser.tree, item, true);
            return false;
          }
          return true;
        },

        selected: function(item, data) {
          if(!data || data._type != 'database') {
            return false;
          }
          pgBrowser.tree.addIcon(item, {icon: data.icon});
          if (!data.connected && data.allowConn && !data.is_connecting) {
            data.is_connecting = true;
            connect_to_database(this, data, pgBrowser.tree, item, false);
          }

          return pgBrowser.Node.callbacks.selected.apply(this, arguments);
        },

        refresh: function(cmd, i) {
          let t = pgBrowser.tree,
            item = i || t.selected(),
            d = t.itemData(item);

          if (!d.allowConn) return;
          pgBrowser.Node.callbacks.refresh.apply(this, arguments);
        },
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        let c_types = ()=>getNodeAjaxOptions('get_ctypes', this, treeNodeInfo, itemNodeData, {
          cacheLevel: 'server',
        });

        return new DatabaseSchema(
          ()=>getNodeVariableSchema(this, treeNodeInfo, itemNodeData, false, true),
          (privileges)=>getNodePrivilegeRoleSchema(this, treeNodeInfo, itemNodeData, privileges),
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            encoding:
              ()=>getNodeAjaxOptions('get_encodings', this, treeNodeInfo, itemNodeData, {
                cacheLevel: 'server',
              }),
            template:
              ()=>getNodeAjaxOptions('get_databases', this, treeNodeInfo, itemNodeData, {
                cacheLevel: 'server',
              }, (data)=>{
                let res = [];
                if (data && _.isArray(data)) {
                  _.each(data, function(d) {
                    res.push({label: d, value: d,
                      image: 'pg-icon-database'});
                  });
                }
                return res;
              }),
            spcname:
              ()=>getNodeListByName('tablespace', treeNodeInfo, itemNodeData, {}, (m)=>{
                return (m.label != 'pg_global');
              }),
            datcollate: c_types,
            datctype: c_types,
          },
          {
            datowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
          }
        );
      },
    });

    pgBrowser.SecurityGroupSchema = {
      id: 'security', label: gettext('Security'), type: 'group',
      // Show/Hide security group for nodes under the catalog
      visible: function(args) {
        if (args && 'node_info' in args) {
          // If node_info is not present in current object then it might in its
          // parent in case if we used sub node control
          let node_info = args.node_info || args.handler.node_info;
          return 'catalog' in node_info ? false : true;
        }
        return true;
      },
    };

    let connect_to_database = function(obj, data, tree, item, _wasConnected) {
        connect(obj, data, tree, item, _wasConnected);
      },
      connect = function (obj, data, tree, item, _wasConnected) {
        let wasConnected = _wasConnected || data.connected,
          onFailure = function(
            xhr, status, error, _model, _data, _tree, _item, _status
          ) {
            data.is_connecting = false;
            if (xhr.status != 200 && xhr.responseText.search('Ticket expired') !== -1) {
              tree.addIcon(_item, {icon: 'icon-server-connecting'});
              let fetchTicket = Kerberos.fetch_ticket();
              fetchTicket.then(
                function() {
                  connect_to_database(_model, _data, _tree, _item, _wasConnected);
                },
                function(fun_error) {
                  tree.setInode(_item);
                  let dbIcon = data.isTemplate ? 'icon-database-template-not-connected':'icon-database-not-connected';
                  tree.addIcon(_item, {icon: dbIcon});
                  Notify.pgNotifier(fun_error, xhr, gettext('Connect  to database.'));
                }
              );
            } else {
              if (!_status) {
                tree.setInode(_item);
                let dbIcon = data.isTemplate ? 'icon-database-template-not-connected':'icon-database-not-connected';
                tree.addIcon(_item, {icon: dbIcon});
              }

              Notify.pgNotifier('error', xhr, error, function(msg) {
                setTimeout(function() {
                  if (msg == 'CRYPTKEY_SET') {
                    connect_to_database(_model, _data, _tree, _item, _wasConnected);
                  } else {
                    showServerPassword(
                      gettext('Connect to database'),
                      msg, _model, _data, _tree, _item, _status,
                      onSuccess, onFailure, onCancel
                    );
                  }
                }, 100);
              });
            }
          },
          onSuccess = function(
            res, model, _data, _tree, _item, _connected
          ) {
            _data.is_connecting = false;
            if (res && res.data) {
              if(typeof res.data.connected == 'boolean') {
                _data.connected = res.data.connected;
              }
              if (typeof res.data.icon == 'string') {
                _tree.removeIcon(_item);
                _data.icon = res.data.icon;
                let dbIcon = _data.isTemplate ? 'icon-database-template-connected':_data.icon;
                _tree.addIcon(_item, {icon: dbIcon});
              }
              if(res.data.already_connected) {
                res.info = gettext('Database already connected.');
              }
              if(res.data.info_prefix) {
                res.info = `${_.escape(res.data.info_prefix)} - ${res.info}`;
              }
              if(res.data.already_connected) {
                Notify.info(res.info);
              } else {
                Notify.success(res.info);
              }
              // obj.trigger('connected', obj, _item, _data);
              pgBrowser.Events.trigger(
                'pgadmin:database:connected', _item, _data
              );
              /* Call enable/disable menu function after database is connected.
               To make sure all the menus for database is in the right state */
              pgBrowser.enable_disable_menus.apply(pgBrowser, [_item]);

              if (!_connected) {
                setTimeout(function() {
                  _tree.select(_item);
                  _tree.open(_item);
                }, 10);
              }
            }
          },
          onCancel = function(_tree, _item, _data) {
            _data.is_connecting = false;
            let server = _tree.parent(_item);
            _tree.unload(_item);
            _tree.setInode(_item);
            _tree.removeIcon(_item);
            let dbIcon = data.isTemplate ? 'icon-database-template-not-connected':'icon-database-not-connected';
            _tree.addIcon(_item, {icon: dbIcon});
            obj.trigger('connect:cancelled', obj, _item, _data);
            pgBrowser.Events.trigger(
              'pgadmin:database:connect:cancelled', _item, _data, obj
            );
            _tree.select(server);
          };

        $.post(
          obj.generate_url(item, 'connect', data, true)
        ).done(function(res) {
          if (res.success == 1) {
            return onSuccess(res, obj, data, tree, item, wasConnected);
          }
        }).fail(function(xhr, status, error) {
          if (xhr.status === 410) {
            error = gettext('Error: Object not found - %s.', error);
          }

          return onFailure(
            xhr, status, error, obj, data, tree, item, wasConnected
          );
        });
      };
  }

  return pgBrowser.Nodes['coll-database'];
});
