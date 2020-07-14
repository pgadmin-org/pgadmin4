/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.alertifyjs', 'pgadmin.backform', 'pgadmin.backgrid',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'sources/utils',
  'pgadmin.browser.collection', 'pgadmin.browser.table.partition.utils',
],
function(
  gettext, url_for, $, _, pgAdmin, pgBrowser, Alertify, Backform, Backgrid,
  SchemaChildTreeNode, pgadminUtils
) {

  if (!pgBrowser.Nodes['coll-partition']) {
    pgAdmin.Browser.Nodes['coll-partition'] =
      pgAdmin.Browser.Collection.extend({
        node: 'partition',
        label: gettext('Partitions'),
        type: 'coll-partition',
        columns: [
          'name', 'schema', 'partition_value', 'is_partitioned', 'description',
        ],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['partition']) {
    pgAdmin.Browser.Nodes['partition'] = pgBrowser.Node.extend({
      parent_type: 'table',
      collection_type: 'coll-partition',
      type: 'partition',
      label: gettext('Partition'),
      hasSQL: true,
      hasDepends: true,
      hasStatistics: true,
      statsPrettifyFields: [gettext('Size'), gettext('Indexes size'), gettext('Table size'),
        gettext('TOAST table size'), gettext('Tuple length'),
        gettext('Dead tuple length'), gettext('Free space')],
      sqlAlterHelp: 'sql-altertable.html',
      sqlCreateHelp: 'sql-createtable.html',
      dialogHelp: url_for('help.static', {'filename': 'table_dialog.html'}),
      hasScriptTypes: ['create'],
      width: '650px',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'truncate_table', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'truncate_table',
          category: gettext('Truncate'), priority: 3, label: gettext('Truncate'),
          icon: 'fa fa-eraser', enable : 'canCreate',
        },{
          name: 'truncate_table_cascade', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'truncate_table_cascade',
          category: gettext('Truncate'), priority: 3, label: gettext('Truncate Cascade'),
          icon: 'fa fa-eraser', enable : 'canCreate',
        },{
          // To enable/disable all triggers for the table
          name: 'enable_all_triggers', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'enable_triggers_on_table',
          category: gettext('Trigger(s)'), priority: 4, label: gettext('Enable All'),
          icon: 'fa fa-check', enable : 'canCreate_with_trigger_enable',
        },{
          name: 'disable_all_triggers', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'disable_triggers_on_table',
          category: gettext('Trigger(s)'), priority: 4, label: gettext('Disable All'),
          icon: 'fa fa-times', enable : 'canCreate_with_trigger_disable',
        },{
          name: 'reset_table_stats', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'reset_table_stats',
          category: 'Reset', priority: 4, label: gettext('Reset Statistics'),
          icon: 'fa fa-bar-chart', enable : 'canCreate',
        },{
          name: 'detach_partition', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'detach_partition',
          priority: 2, label: gettext('Detach Partition'),
          icon: 'fa fa-remove',
        },
        ]);
      },
      generate_url: function(item, type, d, with_id, info) {
        if (_.indexOf([
          'stats', 'statistics', 'dependency', 'dependent', 'reset',
          'get_relations', 'get_oftype', 'get_attach_tables',
        ], type) == -1) {
          return pgBrowser.Node.generate_url.apply(this, arguments);
        }

        if (type == 'statistics') {
          type = 'stats';
        }

        info = (_.isUndefined(item) || _.isNull(item)) ?
          info || {} : this.getTreeNodeHierarchy(item);

        return pgadminUtils.sprintf('table/%s/%s/%s/%s/%s/%s',
          encodeURIComponent(type), encodeURIComponent(info['server_group']._id),
          encodeURIComponent(info['server']._id),
          encodeURIComponent(info['database']._id),
          encodeURIComponent(info['partition'].schema_id),
          encodeURIComponent(info['partition']._id)
        );
      },
      canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      callbacks: {
        /* Enable trigger(s) on table */
        enable_triggers_on_table: function(args) {
          var params = {'is_enable_trigger': 'O'};
          this.callbacks.set_triggers.apply(this, [args, params]);
        },
        /* Disable trigger(s) on table */
        disable_triggers_on_table: function(args) {
          var params = {'is_enable_trigger': 'D'};
          this.callbacks.set_triggers.apply(this, [args, params]);
        },
        set_triggers: function(args, params) {
          // This function will send request to enable or
          // disable triggers on table level
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          $.ajax({
            url: obj.generate_url(i, 'set_trigger' , d, true),
            type:'PUT',
            data: params,
            dataType: 'json',
          })
            .done(function(res) {
              if (res.success == 1) {
                Alertify.success(res.info);
                t.unload(i);
                t.setInode(i);
                t.deselect(i);
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
        /* Truncate table */
        truncate_table: function(args) {
          var params = {'cascade': false };
          this.callbacks.truncate.apply(this, [args, params]);
        },
        /* Truncate table with cascade */
        truncate_table_cascade: function(args) {
          var params = {'cascade': true };
          this.callbacks.truncate.apply(this, [args, params]);
        },
        truncate: function(args, params) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          Alertify.confirm(
            gettext('Truncate Table'),
            gettext('Are you sure you want to truncate table %s?', d.label),
            function (e) {
              if (e) {
                var data = d;
                $.ajax({
                  url: obj.generate_url(i, 'truncate' , d, true),
                  type:'PUT',
                  data: params,
                  dataType: 'json',
                })
                  .done(function(res) {
                    if (res.success == 1) {
                      Alertify.success(res.info);
                      t.removeIcon(i);
                      data.icon = 'icon-partition';
                      t.addIcon(i, {icon: data.icon});
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
              }},
            function() {}
          );
        },
        reset_table_stats: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          Alertify.confirm(
            gettext('Reset statistics'),
            gettext('Are you sure you want to reset the statistics for table "%s"?', d._label),
            function (e) {
              if (e) {
                var data = d;
                $.ajax({
                  url: obj.generate_url(i, 'reset' , d, true),
                  type:'DELETE',
                })
                  .done(function(res) {
                    if (res.success == 1) {
                      Alertify.success(res.info);
                      t.removeIcon(i);
                      data.icon = 'icon-partition';
                      t.addIcon(i, {icon: data.icon});
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
              }
            },
            function() {}
          );
        },
        detach_partition: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          Alertify.confirm(
            gettext('Detach Partition'),
            gettext('Are you sure you want to detach the partition %s?', d._label),
            function (e) {
              if (e) {
                $.ajax({
                  url: obj.generate_url(i, 'detach' , d, true),
                  type:'PUT',
                })
                  .done(function(res) {
                    if (res.success == 1) {
                      Alertify.success(res.info);
                      var n = t.next(i);
                      if (!n || !n.length) {
                        n = t.prev(i);
                        if (!n || !n.length) {
                          n = t.parent(i);
                          t.setInode(n, true);
                        }
                      }
                      t.remove(i);
                      if (n.length) {
                        t.select(n);
                      }
                    }
                  })
                  .fail(function(xhr, status, error) {
                    Alertify.pgRespErrorNotify(xhr, error);
                  });
              }
            },
            function() {}
          );
        },
      },
      model: pgBrowser.Node.Model.extend({
        defaults: {
          name: undefined,
          oid: undefined,
          spcoid: undefined,
          spcname: undefined,
          relowner: undefined,
          relacl: undefined,
          relhasoids: undefined,
          relhassubclass: undefined,
          reltuples: undefined,
          description: undefined,
          conname: undefined,
          conkey: undefined,
          isrepl: undefined,
          triggercount: undefined,
          relpersistence: undefined,
          fillfactor: undefined,
          reloftype: undefined,
          typname: undefined,
          labels: undefined,
          providers: undefined,
          is_sys_table: undefined,
          coll_inherits: [],
          hastoasttable: true,
          toast_autovacuum_enabled: 'x',
          autovacuum_enabled: 'x',
          primary_key: [],
          partitions: [],
          partition_type: 'range',
          is_partitioned: false,
          partition_value: undefined,
        },
        // Default values!
        initialize: function(attrs, args) {
          if (_.size(attrs) === 0) {
            var userInfo = pgBrowser.serverInfo[
                args.node_info.server._id
              ].user,
              schemaInfo = args.node_info.schema;

            this.set({
              'relowner': userInfo.name, 'schema': schemaInfo._label,
            }, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);

        },
        schema: [{
          id: 'name', label: gettext('Name'), type: 'text',
          mode: ['properties', 'create', 'edit'], disabled: 'inSchema',
        },{
          id: 'oid', label: gettext('OID'), type: 'text', mode: ['properties'],
        },{
          id: 'relowner', label: gettext('Owner'), type: 'text', node: 'role',
          mode: ['properties', 'create', 'edit'], select2: {allowClear: false},
          disabled: 'inSchema', control: 'node-list-by-name',
        },{
          id: 'schema', label: gettext('Schema'), type: 'text', node: 'schema',
          control: 'node-list-by-name', mode: ['create', 'edit', 'properties'],
          disabled: 'inSchema', filter: function(d) {
            // If schema name start with pg_* then we need to exclude them
            if(d && d.label.match(/^pg_/))
            {
              return false;
            }
            return true;
          }, cache_node: 'database', cache_level: 'database',
        },{
          id: 'spcname', label: gettext('Tablespace'), node: 'tablespace',
          type: 'text', control: 'node-list-by-name', disabled: 'inSchema',
          mode: ['properties', 'create', 'edit'],
          filter: function(d) {
            // If tablespace name is not "pg_global" then we need to exclude them
            return (!(d && d.label.match(/pg_global/)));
          },
        },{
          id: 'partition', type: 'group', label: gettext('Partition'),
          mode: ['edit', 'create'], min_version: 100000,
          visible: function(m) {
            // Always show in case of create mode
            if (m.isNew() || m.get('is_partitioned'))
              return true;
            return false;
          },
        },{
          id: 'is_partitioned', label:gettext('Partitioned table?'), cell: 'switch',
          type: 'switch', mode: ['properties', 'create', 'edit'],
          visible: function(m) {
            if(!_.isUndefined(m.node_info) && !_.isUndefined(m.node_info.server)
              && !_.isUndefined(m.node_info.server.version) &&
              m.node_info.server.version >= 100000)
              return true;

            return false;
          },
          readonly: function(m) {
            if (!m.isNew())
              return true;
            return false;
          },
        },{
          id: 'description', label: gettext('Comment'), type: 'multiline',
          mode: ['properties', 'create', 'edit'], disabled: 'inSchema',
        },
        {
          id: 'partition_value', label:gettext('Partition Scheme'),
          type: 'text', visible: false,
        },{
          id: 'coll_inherits', label: gettext('Inherited from table(s)'),
          type: 'text', group: gettext('Advanced'), mode: ['properties'],
        },{
          id: 'Columns', type: 'group', label: gettext('Columns'),
          mode: ['edit', 'create'], min_version: 100000,
          // Always hide in case of partition table.
          visible: function() { return false; },
        },{
          // Tab control for columns
          id: 'columns', label: gettext('Columns'), type: 'collection',
          group: gettext('Columns'),
          model: pgBrowser.Nodes['column'].model,
          subnode: pgBrowser.Nodes['column'].model,
          mode: ['create', 'edit'],
          disabled: function(m) {
            // In case of partitioned table remove inherited columns
            if (m.isNew() && m.get('is_partitioned')) {
              setTimeout(function() {
                var coll = m.get('columns');
                coll.remove(coll.filter(function(model) {
                  if (_.isUndefined(model.get('inheritedfrom')))
                    return false;
                  return true;
                }));
              }, 10);
            }

            if(this.node_info &&  'catalog' in this.node_info)
            {
              return true;
            }
            return false;
          },
          deps: ['typname', 'is_partitioned'],
          canAdd: 'check_grid_add_condition',
          canEdit: true, canDelete: true,
          // For each row edit/delete button enable/disable
          canEditRow: 'check_grid_row_edit_delete',
          canDeleteRow: 'check_grid_row_edit_delete',
          uniqueCol : ['name'],
          columns : ['name' , 'cltype', 'attlen', 'attprecision', 'attnotnull', 'is_primary_key'],
          control: Backform.UniqueColCollectionControl.extend({
            initialize: function() {
              Backform.UniqueColCollectionControl.prototype.initialize.apply(this, arguments);
              var self = this,
                collection = self.model.get(self.field.get('name'));

              collection.on('change:is_primary_key', function(local_model) {
                var primary_key_coll = self.model.get('primary_key'),
                  column_name = local_model.get('name'),
                  primary_key, primary_key_column_coll;

                if(local_model.get('is_primary_key')) {
                // Add column to primary key.
                  if (primary_key_coll.length < 1) {
                    primary_key = new (primary_key_coll.model)({}, {
                      top: self.model,
                      collection: primary_key_coll,
                      handler: primary_key_coll,
                    });
                    primary_key_coll.add(primary_key);
                  } else {
                    primary_key = primary_key_coll.first();
                  }
                  // Do not alter existing primary key columns.
                  if (_.isUndefined(primary_key.get('oid'))) {
                    primary_key_column_coll = primary_key.get('columns');
                    var  primary_key_column_exist = primary_key_column_coll.where({column:column_name});

                    if (primary_key_column_exist.length == 0) {
                      var primary_key_column = new (primary_key_column_coll.model)(
                        {column: column_name}, { silent: true,
                          top: self.model,
                          collection: primary_key_coll,
                          handler: primary_key_coll,
                        });

                      primary_key_column_coll.add(primary_key_column);
                    }

                    primary_key_column_coll.trigger(
                      'pgadmin:multicolumn:updated', primary_key_column_coll
                    );
                  }

                } else {
                // remove column from primary key.
                  if (primary_key_coll.length > 0) {
                    primary_key = primary_key_coll.first();
                    // Do not alter existing primary key columns.
                    if (!_.isUndefined(primary_key.get('oid'))) {
                      return;
                    }

                    primary_key_column_coll = primary_key.get('columns');
                    var removedCols = primary_key_column_coll.where({
                      column: column_name,
                    });
                    if (removedCols.length > 0) {
                      primary_key_column_coll.remove(removedCols);
                      _.each(removedCols, function(m) {
                        m.destroy();
                      });
                      if (primary_key_column_coll.length == 0) {
                        setTimeout(function () {
                          // There will be only on primary key so remove the first one.
                          primary_key_coll.remove(primary_key_coll.first());
                          /* Ideally above line of code should be "primary_key_coll.reset()".
                           * But our custom DataCollection (extended from Backbone collection in datamodel.js)
                           * does not respond to reset event, it only supports add, remove, change events.
                           * And hence no custom event listeners/validators get called for reset event.
                           */
                        }, 10);
                      }
                    }
                    primary_key_column_coll.trigger('pgadmin:multicolumn:updated', primary_key_column_coll);
                  }
                }
              });
            },
            remove: function() {
              var collection = this.model.get(this.field.get('name'));
              if (collection) {
                collection.off('change:is_primary_key');
              }

              Backform.UniqueColCollectionControl.prototype.remove.apply(this, arguments);
            },
          }),
          allowMultipleEmptyRow: false,
        },{
          id: 'inherited_tables_cnt', label: gettext('Inherited tables count'),
          type: 'text', mode: ['properties'], group: gettext('Advanced'),
          disabled: 'inSchema',
        },{
          // Here we will create tab control for constraints
          type: 'nested', control: 'tab', group: gettext('Constraints'),
          mode: ['edit', 'create'],
          schema: [{
            id: 'primary_key', label: gettext('Primary key'),
            model: pgBrowser.Nodes['primary_key'].model,
            subnode: pgBrowser.Nodes['primary_key'].model,
            editable: false, type: 'collection',
            group: gettext('Primary Key'), mode: ['edit', 'create'],
            canEdit: true, canDelete: true, deps:['is_partitioned'],
            control: 'unique-col-collection',
            columns : ['name', 'columns'],
            canAdd: function(m) {
              if (m.get('is_partitioned') && !_.isUndefined(m.top.node_info) && !_.isUndefined(m.top.node_info.server)
              && !_.isUndefined(m.top.node_info.server.version) &&
                m.top.node_info.server.version < 110000) {
                setTimeout(function() {
                  var coll = m.get('primary_key');
                  coll.remove(coll.filter(function() { return true; }));
                }, 10);
                return false;
              }

              return true;
            },
            canAddRow: function(m) {
              // User can only add one primary key
              var columns = m.get('columns');

              return (m.get('primary_key') &&
                        m.get('primary_key').length < 1 &&
                        _.some(columns.pluck('name')));
            },
          },{
            id: 'foreign_key', label: gettext('Foreign key'),
            model: pgBrowser.Nodes['foreign_key'].model,
            subnode: pgBrowser.Nodes['foreign_key'].model,
            editable: false, type: 'collection',
            group: gettext('Foreign Key'), mode: ['edit', 'create'],
            canEdit: true, canDelete: true, deps:['is_partitioned'],
            control: 'unique-col-collection',
            canAdd: function(m) {
              if (m.get('is_partitioned')) {
                setTimeout(function() {
                  var coll = m.get('foreign_key');
                  coll.remove(coll.filter(function() { return true; }));
                }, 10);
                return false;
              }

              return true;
            },
            columns : ['name', 'columns'],
            canAddRow: function(m) {
              // User can only add if there is at least one column with name.
              var columns = m.get('columns');
              return _.some(columns.pluck('name'));
            },
          },{
            id: 'check_constraint', label: gettext('Check constraint'),
            model: pgBrowser.Nodes['check_constraint'].model,
            subnode: pgBrowser.Nodes['check_constraint'].model,
            editable: false, type: 'collection',
            group: gettext('Check'), mode: ['edit', 'create'],
            canEdit: true, canDelete: true, deps:['is_partitioned'],
            control: 'unique-col-collection',
            canAdd: true,
            columns : ['name', 'consrc'],
          },{
            id: 'unique_constraint', label: gettext('Unique Constraint'),
            model: pgBrowser.Nodes['unique_constraint'].model,
            subnode: pgBrowser.Nodes['unique_constraint'].model,
            editable: false, type: 'collection',
            group: gettext('Unique'), mode: ['edit', 'create'],
            canEdit: true, canDelete: true, deps:['is_partitioned'],
            control: 'unique-col-collection',
            columns : ['name', 'columns'],
            canAdd: function(m) {
              if (m.get('is_partitioned')) {
                setTimeout(function() {
                  var coll = m.get('unique_constraint');
                  coll.remove(coll.filter(function() { return true; }));
                }, 10);
                return false;
              }

              return true;
            },
            canAddRow: function(m) {
              // User can only add if there is at least one column with name.
              var columns = m.get('columns');
              return _.some(columns.pluck('name'));
            },
          },{
            id: 'exclude_constraint', label: gettext('Exclude constraint'),
            model: pgBrowser.Nodes['exclusion_constraint'].model,
            subnode: pgBrowser.Nodes['exclusion_constraint'].model,
            editable: false, type: 'collection',
            group: gettext('Exclude'), mode: ['edit', 'create'],
            canEdit: true, canDelete: true, deps:['is_partitioned'],
            control: 'unique-col-collection',
            columns : ['name', 'columns', 'constraint'],
            canAdd: function(m) {
              if (m.get('is_partitioned')) {
                setTimeout(function() {
                  var coll = m.get('exclude_constraint');
                  coll.remove(coll.filter(function() { return true; }));
                }, 10);
                return false;
              }

              return true;
            },
            canAddRow: function(m) {
              // User can only add if there is at least one column with name.
              var columns = m.get('columns');
              return _.some(columns.pluck('name'));
            },
          }],
        },{
          id: 'typname', label: gettext('Of type'), type: 'text',
          mode: ['properties', 'create', 'edit'], group: gettext('Advanced'),
          disabled: 'checkOfType', url: 'get_oftype',
          deps: ['coll_inherits', 'is_partitioned'],
          transform: function(data, cell) {
            var control = cell || this,
              m = control.model;
            m.of_types_tables = data;
            return data;
          },
          control: Backform.NodeAjaxOptionsControl.extend({
            // When of_types changes we need to clear columns collection
            onChange: function() {
              Backform.NodeAjaxOptionsControl.prototype.onChange.apply(this, arguments);
              var self = this,
                tbl_name = self.model.get('typname'),
                data = undefined,
                arg = undefined,
                column_collection = self.model.get('columns');

              if (!_.isUndefined(tbl_name) &&
                    tbl_name !== '' && column_collection.length !== 0) {
                var msg = gettext('Changing of table type will clear columns collection.');
                Alertify.confirm(msg, function (e) {
                  if (e) {
                    // User clicks Ok, lets clear columns collection
                    column_collection.reset();
                  } else {
                    return this;
                  }
                });
              } else if (!_.isUndefined(tbl_name) && tbl_name === '') {
                column_collection.reset();
              }

              // Run Ajax now to fetch columns
              if (!_.isUndefined(tbl_name) && tbl_name !== '') {
                arg = { 'tname': tbl_name };
                data = self.model.fetch_columns_ajax.apply(self, [arg]);
                // Add into column collection
                column_collection.set(data, { merge:false,remove:false });
              }
            },
          }),
        },{
          id: 'fillfactor', label: gettext('Fill factor'), type: 'int',
          mode: ['create', 'edit'], min: 10, max: 100,
          group: gettext('Advanced'),
          disabled: function(m) {
            if(m.get('is_partitioned')) {
              return true;
            }
            return m.inSchema();
          },
        },{
          id: 'relhasoids', label: gettext('Has OIDs?'), cell: 'switch',
          type: 'switch', mode: ['properties', 'create', 'edit'],
          disabled: true, group: gettext('Advanced'),
        },{
          id: 'relpersistence', label: gettext('Unlogged?'), cell: 'switch',
          type: 'switch', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchemaWithModelCheck',
          group: gettext('Advanced'),
        },{
          id: 'conname', label: gettext('Primary key'), cell: 'string',
          type: 'text', mode: ['properties'], group: gettext('Advanced'),
          disabled: 'inSchema',
        },{
          id: 'reltuples', label: gettext('Rows (estimated)'), cell: 'string',
          type: 'text', mode: ['properties'], group: gettext('Advanced'),
          disabled: 'inSchema',
        },{
          id: 'rows_cnt', label: gettext('Rows (counted)'), cell: 'string',
          type: 'text', mode: ['properties'], group: gettext('Advanced'),
          disabled: 'inSchema',
        },{
          id: 'relhassubclass', label: gettext('Inherits tables?'), cell: 'switch',
          type: 'switch', mode: ['properties'], group: gettext('Advanced'),
          disabled: 'inSchema',
        },{
          id: 'is_sys_table', label: gettext('System table?'), cell: 'switch',
          type: 'switch', mode: ['properties'],
          disabled: 'inSchema',
        },{
          type: 'nested', control: 'fieldset', label: gettext('Like'),
          group: gettext('Advanced'),
          schema:[{
            id: 'like_relation', label: gettext('Relation'),
            type: 'text', mode: ['create', 'edit'], deps: ['typname'],
            control: 'node-ajax-options', url: 'get_relations',
            disabled: 'isLikeDisable', group: gettext('Like'),
          },{
            id: 'like_default_value', label: gettext('With default values?'),
            type: 'switch', mode: ['create', 'edit'], deps: ['typname'],
            disabled: 'isLikeDisable', group: gettext('Like'),
          },{
            id: 'like_constraints', label: gettext('With constraints?'),
            type: 'switch', mode: ['create', 'edit'], deps: ['typname'],
            disabled: 'isLikeDisable', group: gettext('Like'),
          },{
            id: 'like_indexes', label: gettext('With indexes?'),
            type: 'switch', mode: ['create', 'edit'], deps: ['typname'],
            disabled: 'isLikeDisable', group: gettext('Like'),
          },{
            id: 'like_storage', label: gettext('With storage?'),
            type: 'switch', mode: ['create', 'edit'], deps: ['typname'],
            disabled: 'isLikeDisable', group: gettext('Like'),
          },{
            id: 'like_comments', label: gettext('With comments?'),
            type: 'switch', mode: ['create', 'edit'], deps: ['typname'],
            disabled: 'isLikeDisable', group: gettext('Like'),
          }],
        },{
          id: 'partition_type', label:gettext('Partition Type'),
          editable: false, type: 'select2', select2: {allowClear: false},
          group: 'partition', deps: ['is_partitioned'],
          options:[{
            label: gettext('Range'), value: 'range',
          },{
            label: gettext('List'), value: 'list',
          }],
          mode:['create'],
          visible: function(m) {
            if(!_.isUndefined(m.node_info) && !_.isUndefined(m.node_info.server)
              && !_.isUndefined(m.node_info.server.version) &&
              m.node_info.server.version >= 100000)
              return true;

            return false;
          },
          readonly: function(m) {
            return !m.isNew();
          },
          disabled: function(m) {
            return !m.get('is_partitioned');
          },
        },{
          id: 'partition_keys', label:gettext('Partition Keys'),
          model: Backform.PartitionKeyModel,
          subnode: Backform.PartitionKeyModel,
          editable: true, type: 'collection',
          group: 'partition', mode: ['create'],
          deps: ['is_partitioned', 'partition_type'],
          canEdit: false, canDelete: true,
          control: 'sub-node-collection',
          canAdd: function(m) {
            if (m.isNew() && m.get('is_partitioned'))
              return true;
            return false;
          },
          canAddRow: function(m) {
            var columns = m.get('columns');
            var max_row_count = 1000;

            if (m.get('partition_type') && m.get('partition_type') == 'list')
              max_row_count = 1;

            return (m.get('partition_keys') &&
                m.get('partition_keys').length < max_row_count &&
                _.some(columns.pluck('name'))
            );
          },
          visible: function(m) {
            if(!_.isUndefined(m.node_info) && !_.isUndefined(m.node_info.server)
              && !_.isUndefined(m.node_info.server.version) &&
              m.node_info.server.version >= 100000)
              return true;

            return false;
          },
          disabled: function(m) {
            if (m.get('partition_keys') && m.get('partition_keys').models.length > 0) {
              setTimeout(function () {
                var coll = m.get('partition_keys');
                coll.remove(coll.filter(function() { return true; }));
              }, 10);
            }
          },
        },{
          id: 'partition_scheme', label: gettext('Partition Scheme'),
          type: 'note', group: 'partition', mode: ['edit'],
          visible: function(m) {
            if(!_.isUndefined(m.node_info) && !_.isUndefined(m.node_info.server)
              && !_.isUndefined(m.node_info.server.version) &&
              m.node_info.server.version >= 100000)
              return true;

            return false;
          },
          disabled: function(m) {
            if (!m.isNew()) {
              this.text = m.get('partition_scheme');
            }
          },
        },{
          id: 'partitions', label:gettext('Partitions'),
          model: Backform.PartitionsModel,
          subnode: Backform.PartitionsModel,
          editable: true, type: 'collection',
          group: 'partition', mode: ['edit', 'create'],
          deps: ['is_partitioned', 'partition_type'],
          canEdit: true, canDelete: true,
          customDeleteTitle: gettext('Detach Partition'),
          customDeleteMsg: gettext('Are you sure you wish to detach this partition?'),
          columns:['is_attach', 'partition_name', 'is_default', 'values_from', 'values_to', 'values_in', 'values_modulus', 'values_remainder'],
          control: Backform.SubNodeCollectionControl.extend({
            row: Backgrid.PartitionRow,
            initialize: function() {
              Backform.SubNodeCollectionControl.prototype.initialize.apply(this, arguments);
              var self = this;
              if (!this.model.isNew()) {
                var node = this.field.get('schema_node'),
                  node_info = this.field.get('node_info');

                // Make ajax call to get the tables to be attached
                $.ajax({
                  url: node.generate_url.apply(
                    node, [
                      null, 'get_attach_tables', this.field.get('node_data'),
                      true, node_info,
                    ]),

                  type: 'GET',
                  async: false,
                })
                  .done(function(res) {
                    if (res.success == 1) {
                      self.model.table_options = res.data;
                    }
                    else {
                      Alertify.alert(
                        gettext('Error fetching tables to be attached'), res.data.result
                      );
                    }
                  })
                  .fail(function(xhr, status, error) {
                    Alertify.pgRespErrorNotify(xhr, error, gettext('Error fetching tables to be attached'));
                  });
              }
            },
          }
          ),
          canAdd: function(m) {
            if (m.get('is_partitioned'))
              return true;
            return false;
          },
          visible: function(m) {
            if(!_.isUndefined(m.node_info) && !_.isUndefined(m.node_info.server)
              && !_.isUndefined(m.node_info.server.version) &&
              m.node_info.server.version >= 100000)
              return true;

            return false;
          },
          disabled: function(m) {
            if (
              m.isNew() && m.get('partitions') &&
                m.get('partitions').models.length > 0
            ) {
              setTimeout(function () {
                var coll = m.get('partitions');
                coll.remove(coll.filter(function() { return true; }));
              }, 10);
            }
          },
        },{
          id: 'partition_note', label: gettext('Partition'),
          type: 'note', group: 'partition',
          text: [
            '<ul><li>',
            '<strong>', gettext('Create a table: '), '</strong>',
            gettext('User can create multiple partitions while creating new partitioned table. Operation switch is disabled in this scenario.'),
            '</li><li>',
            '<strong>', gettext('Edit existing table: '), '</strong>',
            gettext('User can create/attach/detach multiple partitions. In attach operation user can select table from the list of suitable tables to be attached.'),
            '</li><li>',
            '<strong>', gettext('Default: '), '</strong>',
            gettext('The default partition can store rows that do not fall into any existing partition’s range or list.'),
            '</li><li>',
            '<strong>', gettext('From/To/In input: '), '</strong>',
            gettext('From/To/In input: Values for these fields must be quoted with single quote. For more than one partition key values must be comma(,) separated.'),
            '</li><li>',
            '<strong>', gettext('Example: From/To: '), '</strong>',
            gettext('Enabled for range partition. Consider partitioned table with multiple keys of type Integer, then values should be specified like \'100\',\'200\'.'),
            '</li><li>',
            '<strong>', gettext('In: '), '</strong>',
            gettext('Enabled for list partition. Values must be comma(,) separated and quoted with single quote.'),
            '</li><li>',
            '<strong>', gettext('Modulus/Remainder: '), '</strong>',
            gettext('Enabled for hash partition.'),
            '</li></ul>',
          ].join(''),
          visible: function(m) {
            if(!_.isUndefined(m.node_info) && !_.isUndefined(m.node_info.server)
              && !_.isUndefined(m.node_info.server.version) &&
              m.node_info.server.version >= 100000)
              return true;

            return false;
          },
        },{
          // Here - we will create tab control for storage parameters
          // (auto vacuum).
          type: 'nested', control: 'tab', group: gettext('Parameter'),
          mode: ['edit', 'create'], deps: ['is_partitioned'],
          schema: Backform.VacuumSettingsSchema,
        },{
          id: 'relacl_str', label: gettext('Privileges'), disabled: 'inSchema',
          type: 'text', mode: ['properties'], group: gettext('Security'),
        }, pgBrowser.SecurityGroupSchema,{
          id: 'relacl', label: gettext('Privileges'), type: 'collection',
          group: 'security', control: 'unique-col-collection',
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['a','r','w','d','D','x','t']}),
          mode: ['edit', 'create'], canAdd: true, canDelete: true,
          uniqueCol : ['grantee'],
        },{
          id: 'seclabels', label: gettext('Security labels'), canEdit: false,
          model: pgBrowser.SecLabelModel, editable: false, canAdd: true,
          type: 'collection', min_version: 90100, mode: ['edit', 'create'],
          group: 'security', canDelete: true, control: 'unique-col-collection',
        },{
          id: 'vacuum_settings_str', label: gettext('Storage settings'),
          type: 'multiline', group: gettext('Advanced'), mode: ['properties'],
        }],
        sessChanged: function() {
          /* If only custom autovacuum option is enabled then check if the options table is also changed. */
          if(_.size(this.sessAttrs) == 2 && this.sessAttrs['autovacuum_custom'] && this.sessAttrs['toast_autovacuum']) {
            return this.get('vacuum_table').sessChanged() || this.get('vacuum_toast').sessChanged();
          }
          if(_.size(this.sessAttrs) == 1 && (this.sessAttrs['autovacuum_custom'] || this.sessAttrs['toast_autovacuum'])) {
            return this.get('vacuum_table').sessChanged() || this.get('vacuum_toast').sessChanged();
          }
          return pgBrowser.DataModel.prototype.sessChanged.apply(this);
        },
        validate: function(keys) {
          var msg,
            name = this.get('name'),
            schema = this.get('schema'),
            relowner = this.get('relowner'),
            is_partitioned = this.get('is_partitioned'),
            partition_keys = this.get('partition_keys');

          // If nothing to validate or VacuumSetting keys then
          // return from here
          if ( keys && (keys.length == 0
                        || _.indexOf(keys, 'autovacuum_enabled') != -1
                        || _.indexOf(keys, 'toast_autovacuum_enabled') != -1) ) {
            return null;
          }

          // Have to clear existing validation before initiating current state validation only
          this.errorModel.clear();

          if (_.isUndefined(name) || _.isNull(name) ||
            String(name).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Table name cannot be empty.');
            this.errorModel.set('name', msg);
            return msg;
          } else if (_.isUndefined(schema) || _.isNull(schema) ||
            String(schema).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Table schema cannot be empty.');
            this.errorModel.set('schema', msg);
            return msg;
          } else if (_.isUndefined(relowner) || _.isNull(relowner) ||
            String(relowner).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Table owner cannot be empty.');
            this.errorModel.set('relowner', msg);
            return msg;
          } else if (is_partitioned && this.isNew() &&
            !_.isNull(partition_keys) && partition_keys.length <= 0)
          {
            msg = gettext('Please specify at least one key for partitioned table.');
            this.errorModel.set('partition_keys', msg);
            return msg;
          }
          return null;
        },
        // We will disable everything if we are under catalog node
        inSchema: function() {
          if(this.node_info &&  'catalog' in this.node_info)
          {
            return true;
          }
          return false;
        },
        isInheritedTable: function(m) {
          if(!m.inSchema.apply(this, [m])) {
            // Either of_types or coll_inherits has value
            return (
              (_.isUndefined(m.get('coll_inherits')) || m.get('coll_inherits').length == 0)
                &&
                  (_.isUndefined(m.get('typname')) || String(m.get('typname')).replace(/^\s+|\s+$/g, '') === '')
            );
          }
          return false;
        },
        // Oftype is defined?
        checkInheritance: function(m) {
          // Disabled if it is partitioned table
          if (m.get('is_partitioned')) {
            setTimeout( function() {
              m.set('coll_inherits', []);
            }, 10);
            return true;
          }

          // coll_inherits || typname
          if(!m.inSchema.apply(this, [m]) &&
              ( _.isUndefined(m.get('typname')) ||
                _.isNull(m.get('typname')) ||
                String(m.get('typname')).replace(/^\s+|\s+$/g, '') == '')) {
            return false;
          }
          return true;
        },
        // We will disable Like if ofType is defined
        isLikeDisable: function(m) {
          if(!m.inSchemaWithModelCheck.apply(this, [m]) &&
              ( _.isUndefined(m.get('typname')) ||
                _.isNull(m.get('typname')) ||
                String(m.get('typname')).replace(/^\s+|\s+$/g, '') == '')) {
            return false;
          }
          return true;
        },
        // Check for column grid when to Add
        check_grid_add_condition: function(m) {
          var enable_flag = true;
          if(!m.inSchema.apply(this, [m])) {
            // if of_type then disable add in grid
            if (!_.isUndefined(m.get('typname')) &&
                !_.isNull(m.get('typname')) &&
                m.get('typname') !== '') {
              enable_flag = false;
            }
          }
          return enable_flag;
        },
        // Check for column grid when to edit/delete (for each row)
        check_grid_row_edit_delete: function(m) {
          var flag = true;
          if(!_.isUndefined(m.get('inheritedfrom')) &&
               !_.isNull(m.get('inheritedfrom')) &&
               String(m.get('inheritedfrom')).replace(/^\s+|\s+$/g, '') !== '') {
            flag = false;
          }
          return flag;
        },
        // We will disable it if Inheritance is defined
        checkOfType: function(m) {
          // Disabled if it is partitioned table
          if (m.get('is_partitioned')) {
            setTimeout( function() {
              m.set('typname', undefined);
            }, 10);
            return true;
          }

          //coll_inherits || typname
          if(!m.inSchemaWithModelCheck.apply(this, [m]) &&
              (_.isUndefined(m.get('coll_inherits')) ||
               _.isNull(m.get('coll_inherits')) ||
               String(m.get('coll_inherits')).replace(/^\s+|\s+$/g, '') == '')) {
            return false;
          }
          return true;
        },
        // We will check if we are under schema node & in 'create' mode
        inSchemaWithModelCheck: function(m) {
          if(this.node_info &&  'schema' in this.node_info)
          {
            // We will disbale control if it's in 'edit' mode
            return !m.isNew();
          }
          return true;
        },
        isTableAutoVacuumEnable: function(m) {
          // We need to check additional condition to toggle enable/disable
          // for table auto-vacuum
          if(!m.inSchema.apply(this, [m]) &&
              m.get('autovacuum_enabled') === true) {
            return false;
          }
          return true;
        },
        isToastTableAutoVacuumEnable: function(m) {
          // We need to check additional condition to toggle enable/disable
          // for toast table auto-vacuum
          if(!m.inSchemaWithModelCheck.apply(this, [m]) &&
              m.get('toast_autovacuum_enabled') == true) {
            return false;
          }
          return true;
        },
        fetch_columns_ajax: function(arg) {
          var self = this,
            url = 'get_columns',
            m = self.model.top || self.model,
            data = undefined,
            node = this.field.get('schema_node'),
            node_info = this.field.get('node_info'),
            full_url = node.generate_url.apply(
              node, [
                null, url, this.field.get('node_data'),
                this.field.get('url_with_id') || false, node_info,
              ]
            ),
            cache_level = this.field.get('cache_level') || node.type,
            cache_node = this.field.get('cache_node');

          cache_node = (cache_node && pgBrowser.Nodes['cache_node']) || node;

          m.trigger('pgadmin:view:fetching', m, self.field);
          // Fetching Columns data for the selected table.
          $.ajax({
            async: false,
            url: full_url,
            data: arg,
          })
            .done(function(res) {
              data = cache_node.cache(url, node_info, cache_level, res.data);
            })
            .fail(function() {
              m.trigger('pgadmin:view:fetch:error', m, self.field);
            });
          m.trigger('pgadmin:view:fetched', m, self.field);
          data = (data && data.data) || [];
          return data;
        },
      }),
      canCreate: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      // Check to whether table has disable trigger(s)
      canCreate_with_trigger_enable: function(itemData, item, data) {
        if(this.canCreate.apply(this, [itemData, item, data])) {
          // We are here means we can create menu, now let's check condition
          return (itemData.tigger_count > 0);
        }
      },
      // Check to whether table has enable trigger(s)
      canCreate_with_trigger_disable: function(itemData, item, data) {
        if(this.canCreate.apply(this, [itemData, item, data])) {
          // We are here means we can create menu, now let's check condition
          return (itemData.tigger_count > 0 && itemData.has_enable_triggers > 0);
        }
      },
    });
  }

  return pgBrowser.Nodes['partition'];
});
