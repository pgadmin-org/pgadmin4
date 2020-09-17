/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.database', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/utils', 'sources/pgadmin', 'pgadmin.browser.utils',
  'pgadmin.alertifyjs', 'pgadmin.backform', 'pgadmin.browser.collection',
  'pgadmin.browser.server.privilege', 'pgadmin.browser.server.variable',
], function(gettext, url_for, $, _, pgadminUtils, pgAdmin, pgBrowser, Alertify, Backform) {

  if (!pgBrowser.Nodes['coll-database']) {
    pgBrowser.Nodes['coll-database'] =
      pgBrowser.Collection.extend({
        node: 'database',
        label: gettext('Databases'),
        type: 'coll-database',
        columns: ['name', 'datowner', 'comments'],
        hasStatistics: true,
        canDrop: true,
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
          icon: 'wcTabIcon pg-icon-database', data: {action: 'create'},
          enable: 'can_create_database',
        },{
          name: 'create_database_on_coll', node: 'coll-database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Database...'),
          icon: 'wcTabIcon pg-icon-database', data: {action: 'create'},
          enable: 'can_create_database',
        },{
          name: 'create_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Database...'),
          icon: 'wcTabIcon pg-icon-database', data: {action: 'create'},
          enable: 'can_create_database',
        },{
          name: 'connect_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'connect_database',
          category: 'connect', priority: 4, label: gettext('Connect Database...'),
          icon: 'fa fa-link', enable : 'is_not_connected',
        },{
          name: 'disconnect_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'disconnect_database',
          category: 'drop', priority: 5, label: gettext('Disconnect Database...'),
          icon: 'fa fa-unlink', enable : 'is_connected',
        }]);

        _.bindAll(this, 'connection_lost');
        pgBrowser.Events.on(
          'pgadmin:database:connection:lost', this.connection_lost
        );
      },
      can_create_database: function(node, item) {
        var treeData = this.getTreeNodeHierarchy(item),
          server = treeData['server'];

        return server.connected && server.user.can_create_db;
      },
      is_not_connected: function(node) {
        return (node && node.connected != true && node.allowConn == true);
      },
      is_connected: function(node) {
        return (node && node.connected == true && node.canDisconn == true);
      },
      is_conn_allow: function(node) {
        return (node && node.allowConn == true);
      },
      connection_lost: function(i, resp, server_connected) {
        if (pgBrowser.tree) {
          var t = pgBrowser.tree,
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

              var disconnect = function(_i, _d) {
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
              Alertify.confirm(
                gettext('Connection lost'),
                gettext('Would you like to reconnect to the database?'),
                function() {
                  connect(self, d, t, i, true);
                },
                function() {
                  d.is_connecting = false;
                  t.unload(i);
                  t.setInode(i);
                  t.addIcon(i, {icon: 'icon-database-not-connected'});
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
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (d && d.label != 'template0') {
            connect_to_database(obj, d, t, i, true);
          }
          return false;
        },
        /* Disconnect the database */
        disconnect_database: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (d) {
            Alertify.confirm(
              gettext('Disconnect the database'),
              gettext('Are you sure you want to disconnect the database - %s?', d.label),
              function() {
                var data = d;
                $.ajax({
                  url: obj.generate_url(i, 'connect', d, true),
                  type:'DELETE',
                })
                  .done(function(res) {
                    if (res.success == 1) {
                      var prv_i = t.parent(i);
                      if(res.data.info_prefix) {
                        res.info = `${_.escape(res.data.info_prefix)} - ${res.info}`;
                      }
                      Alertify.success(res.info);
                      t.removeIcon(i);
                      data.connected = false;
                      data.icon = 'icon-database-not-connected';
                      t.addIcon(i, {icon: data.icon});
                      t.unload(i);
                      t.setInode(i);
                      setTimeout(function() {
                        t.select(prv_i);
                      }, 10);

                    } else {
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
              },
              function() { return true; }
            ).set('labels', {
              ok: gettext('Yes'),
              cancel: gettext('No'),
            });
          }

          return false;
        },

        /* Connect the database (if not connected), before opening this node */
        beforeopen: function(item, data) {
          if(!data || data._type != 'database' || data.label == 'template0') {
            return false;
          }

          pgBrowser.tree.addIcon(item, {icon: data.icon});
          if (!data.connected && data.allowConn) {
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
          if (!data.connected && data.allowConn) {
            connect_to_database(this, data, pgBrowser.tree, item, false);
            return false;
          }

          return pgBrowser.Node.callbacks.selected.apply(this, arguments);
        },

        refresh: function(cmd, i) {
          var t = pgBrowser.tree,
            item = i || t.selected(),
            d = t.itemData(item);

          if (!d.allowConn) return;
          pgBrowser.Node.callbacks.refresh.apply(this, arguments);
        },
      },
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'did',
        defaults: {
          name: undefined,
          owner: undefined,
          is_sys_obj: undefined,
          comment: undefined,
          encoding: 'UTF8',
          template: undefined,
          tablespace: undefined,
          collation: undefined,
          char_type: undefined,
          datconnlimit: -1,
          datallowconn: undefined,
          variables: [],
          privileges: [],
          securities: [],
          datacl: [],
          deftblacl: [],
          deffuncacl: [],
          defseqacl: [],
          is_template: false,
          deftypeacl: [],
          schema_res:'',
        },

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({'datowner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        schema: [
          {
            id: 'name', label: gettext('Database'), cell: 'string',
            editable: false, type: 'text',
          },{
            id: 'did', label: gettext('OID'), cell: 'string', mode: ['properties'],
            editable: false, type: 'text',
          },{
            id: 'datowner', label: gettext('Owner'),
            editable: false, type: 'text', node: 'role',
            control: Backform.NodeListByNameControl, select2: { allowClear: false },
          },{
            id: 'acl', label: gettext('Privileges'), type: 'text',
            group: gettext('Security'), mode: ['properties'],
          },{
            id: 'tblacl', label: gettext('Default TABLE privileges'), type: 'text',
            group: gettext('Security'), mode: ['properties'],
          },{
            id: 'seqacl', label: gettext('Default SEQUENCE privileges'), type: 'text',
            group: gettext('Security'), mode: ['properties'],
          },{
            id: 'funcacl', label: gettext('Default FUNCTION privileges'), type: 'text',
            group: gettext('Security'), mode: ['properties'],
          },{
            id: 'typeacl', label: gettext('Default TYPE privileges'), type: 'text',
            group: gettext('Security'), mode: ['properties'], min_version: 90200,
          },{
            id: 'is_sys_obj', label: gettext('System database?'),
            cell:'boolean', type: 'switch', mode: ['properties'],
          },{
            id: 'comments', label: gettext('Comment'),
            editable: false, type: 'multiline',
          },{
            id: 'encoding', label: gettext('Encoding'),
            editable: false, type: 'text', group: gettext('Definition'),
            readonly: function(m) { return !m.isNew(); }, url: 'get_encodings',
            control: 'node-ajax-options', cache_level: 'server',
          },{
            id: 'template', label: gettext('Template'),
            editable: false, type: 'text', group: gettext('Definition'),
            readonly: function(m) { return !m.isNew(); },
            control: 'node-list-by-name', url: 'get_databases', cache_level: 'server',
            select2: { allowClear: false }, mode: ['create'],
            transform: function(data, cell) {
              var res = [],
                control = cell || this,
                label = control.model.get('name');

              if (!control.model.isNew()) {
                res.push({label: label, value: label});
              }
              else {
                if (data && _.isArray(data)) {
                  _.each(data, function(d) {
                    res.push({label: d, value: d,
                      image: 'pg-icon-database'});
                  });
                }
              }
              return res;
            },
          },{
            id: 'spcname', label: gettext('Tablespace'),
            editable: false, type: 'text', group: gettext('Definition'),
            control: 'node-list-by-name', node: 'tablespace',
            select2: { allowClear: false },
            filter: function(m) {
              return (m.label != 'pg_global');
            },
          },{
            id: 'datcollate', label: gettext('Collation'),
            editable: false, type: 'text', group: gettext('Definition'),
            readonly: function(m) { return !m.isNew(); }, url: 'get_ctypes',
            control: 'node-ajax-options', cache_level: 'server',
          },{
            id: 'datctype', label: gettext('Character type'),
            editable: false, type: 'text', group: gettext('Definition'),
            readonly: function(m) { return !m.isNew(); }, url: 'get_ctypes',
            control: 'node-ajax-options', cache_level: 'server',
          },{
            id: 'datconnlimit', label: gettext('Connection limit'),
            editable: false, type: 'int', group: gettext('Definition'), min: -1,
          },{
            id: 'is_template', label: gettext('Template?'),
            editable: false, type: 'switch', group: gettext('Definition'),
            readonly: true,  mode: ['properties', 'edit'],
          },{
            id: 'datallowconn', label: gettext('Allow connections?'),
            editable: false, type: 'switch', group: gettext('Definition'),
            mode: ['properties'],
          },{
            id: 'datacl', label: gettext('Privileges'), type: 'collection',
            model: pgBrowser.Node.PrivilegeRoleModel.extend({
              privileges: ['C', 'T', 'c'],
            }), uniqueCol : ['grantee', 'grantor'], editable: false,
            group: gettext('Security'), mode: ['edit', 'create'],
            canAdd: true, canDelete: true, control: 'unique-col-collection',
          },{
            id: 'variables', label: '', type: 'collection',
            model: pgBrowser.Node.VariableModel.extend({keys:['name', 'role']}), editable: false,
            group: gettext('Parameters'), mode: ['edit', 'create'],
            canAdd: true, canEdit: false, canDelete: true, hasRole: true,
            control: Backform.VariableCollectionControl, node: 'role',
          },{
            id: 'seclabels', label: gettext('Security labels'),
            model: pgBrowser.SecLabelModel,
            editable: false, type: 'collection', canEdit: false,
            group: gettext('Security'), canDelete: true,
            mode: ['edit', 'create'], canAdd: true,
            control: 'unique-col-collection', uniqueCol : ['provider'],
            min_version: 90200,
          },{
            type: 'nested', control: 'tab', group: gettext('Default Privileges'),
            mode: ['edit'],
            schema:[{
              id: 'deftblacl', model: pgBrowser.Node.PrivilegeRoleModel.extend(
                {privileges: ['a', 'r', 'w', 'd', 'D', 'x', 't']}), label: '',
              editable: false, type: 'collection', group: gettext('Tables'),
              mode: ['edit', 'create'], control: 'unique-col-collection',
              canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor'],
            },{
              id: 'defseqacl', model: pgBrowser.Node.PrivilegeRoleModel.extend(
                {privileges: ['r', 'w', 'U']}), label: '',
              editable: false, type: 'collection', group: gettext('Sequences'),
              mode: ['edit', 'create'], control: 'unique-col-collection',
              canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor'],
            },{
              id: 'deffuncacl', model: pgBrowser.Node.PrivilegeRoleModel.extend(
                {privileges: ['X']}), label: '',
              editable: false, type: 'collection', group: gettext('Functions'),
              mode: ['edit', 'create'], control: 'unique-col-collection',
              canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor'],
            },{
              id: 'deftypeacl', model: pgBrowser.Node.PrivilegeRoleModel.extend(
                {privileges: ['U']}),  label: '',
              editable: false, type: 'collection', group: 'deftypesacl_group',
              mode: ['edit', 'create'], control: 'unique-col-collection',
              canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor'],
              min_version: 90200,
            },{
              id: 'deftypesacl_group', type: 'group', label: gettext('Types'),
              mode: ['edit', 'create'], min_version: 90200,
            },
            ],
          },{
            type: 'collection', group: gettext('Advanced'),
          },
          {
            id: 'schema_res', label: gettext('Schema restriction'),
            type: 'select2', group: gettext('Advanced'),
            mode: ['properties', 'edit', 'create'],
            helpMessage: gettext('Note: Changes to the schema restriction will require the Schemas node in the browser to be refreshed before they will be shown.'),
            select2: {
              multiple: true, allowClear: false, tags: true,
              tokenSeparators: [','], first_empty: false,
              selectOnClose: true, emptyOptions: true,
            },
            control: Backform.Select2Control.extend({
              onChange: function() {
                Backform.Select2Control.prototype.onChange.apply(this, arguments);
                if (!this.model || !(
                  this.model.changed &&
                this.model.get('oid') !== undefined
                )) {
                  this.model.inform_text = undefined;
                  return;
                }

                if(this.model.origSessAttrs.schema_res != this.model.changed.schema_res)
                {
                  this.model.inform_text = gettext(
                    'Please refresh the Schemas node to make changes to the schema restriction take effect.'
                  );
                } else {
                  this.model.inform_text = undefined;
                }
              },
            }),
          },
        ],
        validate: function() {
          var name = this.get('name');
          if (_.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == '') {
            var msg = gettext('Name cannot be empty.');
            this.errorModel.set('name', msg);
            return msg;
          } else {
            this.errorModel.unset('name');
          }
          return null;
        },
      }),
    });

    pgBrowser.SecurityGroupSchema = {
      id: 'security', label: gettext('Security'), type: 'group',
      // Show/Hide security group for nodes under the catalog
      visible: function(args) {
        if (args && 'node_info' in args) {
          // If node_info is not present in current object then it might in its
          // parent in case if we used sub node control
          var node_info = args.node_info || args.handler.node_info;
          return 'catalog' in node_info ? false : true;
        }
        return true;
      },
    };

    var connect_to_database = function(obj, data, tree, item, _wasConnected) {
        connect(obj, data, tree, item, _wasConnected);
      },
      connect = function (obj, data, tree, item, _wasConnected) {
        var wasConnected = _wasConnected || data.connected,
          onFailure = function(
            xhr, status, error, _model, _data, _tree, _item, _status
          ) {
            if (!_status) {
              tree.setInode(_item);
              tree.addIcon(_item, {icon: 'icon-database-not-connected'});
            }

            Alertify.pgNotifier('error', xhr, error, function(msg) {
              setTimeout(function() {
                if (msg == 'CRYPTKEY_SET') {
                  connect_to_database(_model, _data, _tree, _item, _wasConnected);
                } else {
                  Alertify.dlgServerPass(
                    gettext('Connect to database'),
                    msg, _model, _data, _tree, _item, _status,
                    onSuccess, onFailure, onCancel
                  ).resizeTo();
                }
              }, 100);
            });
          },
          onSuccess = function(
            res, model, _data, _tree, _item, _connected
          ) {
            _data.is_connecting = false;
            if (!_connected) {
              _tree.deselect(_item);
              _tree.setInode(_item);
            }
            if (res && res.data) {
              if(typeof res.data.connected == 'boolean') {
                _data.connected = res.data.connected;
              }
              if (typeof res.data.icon == 'string') {
                _tree.removeIcon(_item);
                _data.icon = res.data.icon;
                _tree.addIcon(_item, {icon: _data.icon});
              }
              if(res.data.already_connected) {
                res.info = gettext('Database already connected.');
              }
              if(res.data.info_prefix) {
                res.info = `${_.escape(res.data.info_prefix)} - ${res.info}`;
              }
              if(res.data.already_connected) {
                Alertify.info(res.info);
              } else {
                Alertify.success(res.info);
              }
              obj.trigger('connected', obj, _item, _data);
              pgBrowser.Events.trigger(
                'pgadmin:database:connected', _item, _data
              );

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
            var server = _tree.parent(_item);
            _tree.unload(_item);
            _tree.setInode(_item);
            _tree.removeIcon(_item);
            _tree.addIcon(_item, {icon: 'icon-database-not-connected'});
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
