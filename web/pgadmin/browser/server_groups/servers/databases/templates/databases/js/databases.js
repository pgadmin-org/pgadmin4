define([
        'jquery', 'underscore', 'underscore.string', 'pgadmin',
        'pgadmin.browser', 'alertify', 'pgadmin.browser.collection',
        'pgadmin.browser.server.privilege', 'pgadmin.browser.server.variable',
        ],
function($, _, S, pgAdmin, pgBrowser, Alertify) {

  if (!pgBrowser.Nodes['coll-database']) {
    var databases = pgBrowser.Nodes['coll-database'] =
      pgBrowser.Collection.extend({
        node: 'database',
        label: '{{ _('Databases') }}',
        type: 'coll-database',
        columns: ['name', 'datowner', 'comments'],
        hasStatistics: true
      });
  };

  if (!pgBrowser.Nodes['database']) {
    pgBrowser.Nodes['database'] = pgBrowser.Node.extend({
      parent_type: 'server',
      type: 'database',
      sqlAlterHelp: 'sql-alterdatabase.html',
      sqlCreateHelp: 'sql-createdatabase.html',
      dialogHelp: '{{ url_for('help.static', filename='database_dialog.html') }}',
      hasSQL: true,
      hasDepends: true,
      hasStatistics: true,
      canDrop: function(node) {
        return node.canDrop;
      },
      label: '{{ _('Database') }}',
      node_image: function() {
        return 'pg-icon-database';
      },
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_database_on_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Database...') }}',
          icon: 'wcTabIcon pg-icon-database', data: {action: 'create'},
          enable: 'can_create_database'
        },{
          name: 'create_database_on_coll', node: 'coll-database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Database...') }}',
          icon: 'wcTabIcon pg-icon-database', data: {action: 'create'},
          enable: 'can_create_database'
        },{
          name: 'create_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Database...') }}',
          icon: 'wcTabIcon pg-icon-database', data: {action: 'create'},
          enable: 'can_create_database'
        },{
          name: 'connect_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'connect_database',
          category: 'connect', priority: 4, label: '{{ _('Connect Database...') }}',
          icon: 'fa fa-link', enable : 'is_not_connected'
        },{
          name: 'disconnect_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'disconnect_database',
          category: 'drop', priority: 5, label: '{{ _('Disconnect Database...') }}',
          icon: 'fa fa-chain-broken', enable : 'is_connected'
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
        return (node && node.connected != true);
      },
      is_connected: function(node) {
        return (node && node.connected == true && node.canDisconn == true);
      },
      connection_lost: function(i, resp, server_connected) {
        if (pgBrowser.tree) {
          var t = pgBrowser.tree,
              info = i && this.getTreeNodeHierarchy(i),
              s = null,
              d = i && t.itemData(i),
              self = this,
              _i = i;

          while (d && d._type != 'database') {
            i = t.parent(i);
            d = i && t.itemData(i);
          }

          if (i && d) {
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
                '{{ _('Connection lost') }}',
                '{{ _('Would you like to reconnect to the database?') }}',
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
          var input = args || {};
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d || d.label == "template0")
            return false;

          connect_to_database(obj, d, t, i, true);
          return false;
        },
        /* Disconnect the database */
        disconnect_database: function(args) {
          var input = args || {};
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          Alertify.confirm(
            '{{ _('Disconnect the database') }}',
            S('{{ _('Are you sure you want to disconnect the database - %s?') }}').sprintf(d.label).value(),
            function(evt) {
              var data = d;
              $.ajax({
                url: obj.generate_url(i, 'connect', d, true),
                type:'DELETE',
                success: function(res) {
                  if (res.success == 1) {
                    var prv_i = t.parent(i);
                    Alertify.success("{{ _('" + res.info + "') }}");
                    t.removeIcon(i);
                    data.connected = false;
                    data.icon = 'icon-database-not-connected';
                    t.addIcon(i, {icon: data.icon});
                    t.unload(i);
                    t.setInode(i);
                    setTimeout(function() {
                        t.select(prv_i);
                    }, 10);

                  }
                  else {
                    try {
                      Alertify.error(res.errormsg);
                    } catch (e) {}
                    t.unload(i);
                  }
                },
                error: function(xhr, status, error) {
                  try {
                    var err = $.parseJSON(xhr.responseText);
                    if (err.success == 0) {
                      Alertify.error(err.errormsg);
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

        /* Connect the database (if not connected), before opening this node */
        beforeopen: function(item, data) {
          if(!data || data._type != 'database' || data.label == "template0") {
            return false;
          }

          pgBrowser.tree.addIcon(item, {icon: data.icon});
          if (!data.connected) {
            connect_to_database(this, data, pgBrowser.tree, item, true);
            return false;
          }
          return true;
        },

        selected: function(item, data) {
          if(!data || data._type != 'database' || data.label == "template0") {
            return false;
          }

          pgBrowser.tree.addIcon(item, {icon: data.icon});
          if (!data.connected) {
            connect_to_database(this, data, pgBrowser.tree, item, false);
            return false;
          }

          return pgBrowser.Node.callbacks.selected.apply(this, arguments);
        },
      },
      model: pgBrowser.Node.Model.extend({
        defaults: {
          name: undefined,
          owner: undefined,
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
          deftypeacl: []
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

        schema: [{
          id: 'name', label: '{{ _('Database') }}', cell: 'string',
          editable: false, type: 'text'
        },{
          id: 'did', label:'{{ _('OID') }}', cell: 'string', mode: ['properties'],
          editable: false, type: 'text'
        },{
          id: 'datowner', label:'{{ _('Owner') }}',
          editable: false, type: 'text', node: 'role',
          control: Backform.NodeListByNameControl, select2: { allowClear: false }
        },{
          id: 'acl', label: '{{ _('Privileges') }}', type: 'text',
          group: '{{ _('Security') }}', mode: ['properties'], disabled: true
        },{
          id: 'tblacl', label: '{{ _('Default TABLE privileges') }}', type: 'text',
          group: '{{ _('Security') }}', mode: ['properties'], disabled: true
        },{
          id: 'seqacl', label: '{{ _('Default SEQUENCE privileges') }}', type: 'text',
          group: '{{ _('Security') }}', mode: ['properties'], disabled: true
        },{
          id: 'funcacl', label: '{{ _('Default FUNCTION privileges') }}', type: 'text',
          group: '{{ _('Security') }}', mode: ['properties'], disabled: true
        },{
          id: 'typeacl', label: '{{ _('Default TYPE privileges') }}', type: 'text',
          group: '{{ _('Security') }}', mode: ['properties'], disabled: true, min_version: 90200
        },{
          id: 'comments', label:'{{ _('Comment') }}',
          editable: false, type: 'multiline'
        },{
          id: 'encoding', label: '{{ _('Encoding') }}',
          editable: false, type: 'text', group: 'Definition',
          disabled: function(m) { return !m.isNew(); }, url: 'get_encodings',
          control: 'node-ajax-options', cache_level: 'server'
        },{
          id: 'template', label: '{{ _('Template') }}',
          editable: false, type: 'text', group: 'Definition',
          disabled: function(m) { return !m.isNew(); },
          control: 'node-list-by-name', url: 'get_databases', cache_level: 'server',
          select2: { allowClear: false },
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
                  res.push({label: d.label, value: d.label,
                            image: 'pg-icon-database'});
                })
              }
            }
            return res;
          }
        },{
          id: 'spcname', label: '{{ _('Tablespace') }}',
          editable: false, type: 'text', group: 'Definition',
          control: 'node-list-by-name', node: 'tablespace',
          select2: { allowClear: false },
          filter: function(m) {
            if (m.label == "pg_global") return false;
            else return true;
          }
        },{
          id: 'datcollate', label: '{{ _('Collation') }}',
          editable: false, type: 'text', group: 'Definition',
          disabled: function(m) { return !m.isNew(); }, url: 'get_ctypes',
          control: 'node-ajax-options', cache_level: 'server'
        },{
          id: 'datctype', label: '{{ _('Character type') }}',
          editable: false, type: 'text', group: 'Definition',
          disabled: function(m) { return !m.isNew(); }, url: 'get_ctypes',
          control: 'node-ajax-options', cache_level: 'server'
        },{
          id: 'datconnlimit', label: '{{ _('Connection limit') }}',
          editable: false, type: 'int', group: 'Definition', min: -1
        },{
          id: 'datallowconn', label: '{{ _('Allow connections?') }}',
          editable: false, type: 'switch', group: 'Definition',
          mode: ['properties'], disabled: true,
          options: {
            'onText': 'Yes', 'offText': 'No',
            'onColor': 'success', 'offColor': 'primary',
            'size': 'small'
          }
        },{
          id: 'datacl', label: '{{ _('Privileges') }}', type: 'collection',
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['C', 'T', 'c']
          }), uniqueCol : ['grantee', 'grantor'], editable: false,
          group: '{{ _('Security') }}', mode: ['edit', 'create'],
          canAdd: true, canDelete: true, control: 'unique-col-collection',
        },{
          id: 'variables', label: '{{ _('Parameters') }}', type: 'collection',
          model: pgBrowser.Node.VariableModel.extend({keys:['name', 'role']}), editable: false,
          group: '{{ _('Parameters') }}', mode: ['edit', 'create'],
          canAdd: true, canEdit: false, canDelete: true, hasRole: true,
          control: Backform.VariableCollectionControl, node: 'role'
        },{
          id: 'seclabels', label: '{{ _('Security Labels') }}',
          model: pgBrowser.SecLabelModel,
          editable: false, type: 'collection', canEdit: false,
          group: '{{ _('Security') }}', canDelete: true,
          mode: ['edit', 'create'], canAdd: true,
          control: 'unique-col-collection', uniqueCol : ['provider'],
          min_version: 90200
        },{
          type: 'nested', control: 'tab', group: '{{ _('Default Privileges') }}',
          mode: ['edit'],
          schema:[{
              id: 'deftblacl', model: pgBrowser.Node.PrivilegeRoleModel.extend(
              {privileges: ['a', 'r', 'w', 'd', 'D', 'x', 't']}), label: '{{ _('Default Privileges: Tables') }}',
              editable: false, type: 'collection', group: '{{ _('Tables') }}',
              mode: ['edit', 'create'], control: 'unique-col-collection',
              canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor']
            },{
              id: 'defseqacl', model: pgBrowser.Node.PrivilegeRoleModel.extend(
              {privileges: ['r', 'w', 'U']}), label: '{{ _('Default Privileges: Sequences') }}',
              editable: false, type: 'collection', group: '{{ _('Sequences') }}',
              mode: ['edit', 'create'], control: 'unique-col-collection',
              canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor']
            },{
              id: 'deffuncacl', model: pgBrowser.Node.PrivilegeRoleModel.extend(
              {privileges: ['X']}), label: '{{ _('Default Privileges: Functions') }}',
              editable: false, type: 'collection', group: '{{ _('Functions') }}',
              mode: ['edit', 'create'], control: 'unique-col-collection',
              canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor']
            },{
              id: 'deftypeacl', model: pgBrowser.Node.PrivilegeRoleModel.extend(
              {privileges: ['U']}),  label: '{{ _('Default Privileges: Types') }}',
              editable: false, type: 'collection', group: 'deftypesacl_group',
              mode: ['edit', 'create'], control: 'unique-col-collection',
              canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor'],
              min_version: 90200
            },{
              id: 'deftypesacl_group', type: 'group', label: '{{ _('Types') }}',
              mode: ['edit', 'create'], min_version: 90200
            }
          ]
        }
        ],
        validate: function(keys) {
          var name = this.get('name');
          if (_.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == '') {
            var msg = '{{ _('Name cannot be empty.') }}';
            this.errorModel.set('name', msg);
            return msg;
          } else {
            this.errorModel.unset('name');
          }
          return null;
        }
      })
    });

    function connect_to_database(obj, data, tree, item, interactive) {
        connect(obj, data, tree, item)
    }

    function connect(obj, data, tree, item, _wasConnected) {
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
                Alertify.dlgServerPass(
                  '{{ _('Connect to database') }}',
                  msg, _model, _data, _tree, _item, _status,
                  onSuccess, onFailure, onCancel
                ).resizeTo();
              }, 100);
            });
          },
          onSuccess = function(
            res, model, data, tree, item, connected
          ) {
            data.is_connecting = false;
            if (!connected) {
              tree.deselect(item);
              tree.setInode(item);
            }

            if (res && res.data) {
              if(typeof res.data.connected == 'boolean') {
                data.connected = res.data.connected;
              }
              if (typeof res.data.icon == 'string') {
                tree.removeIcon(item);
                data.icon = res.data.icon;
                tree.addIcon(item, {icon: data.icon});
              }

              Alertify.success(res.info);
              obj.trigger('connected', obj, item, data);
              pgBrowser.Events.trigger(
                'pgadmin:database:connected', item, data
              );

              if (!connected) {
                setTimeout(function() {
                  tree.select(item);
                  tree.open(item);
                }, 10);
              }
            }
          },
          onCancel = function(_tree, _item, _data, _status) {
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
        obj.generate_url(item, "connect", data, true)
      ).done(function(res) {
        if (res.success == 1) {
          return onSuccess(res, obj, data, tree, item, wasConnected);
        }
      }).fail(function(xhr, status, error) {
        return onFailure(
          xhr, status, error, obj, data, tree, item, wasConnected
        );
      });
    }
  }

  return pgBrowser.Nodes['coll-database'];
});
