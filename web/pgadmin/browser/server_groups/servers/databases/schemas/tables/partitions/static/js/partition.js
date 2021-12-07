/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodePartitionTableSchema } from './partition.ui';
import Notify from '../../../../../../../../../static/js/helpers/Notifier';

define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.alertifyjs', 'pgadmin.backform', 'pgadmin.backgrid',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'sources/utils',
  'pgadmin.browser.collection',
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
          data: {
            data_disabled: gettext('The selected tree node does not support this option.'),
          },
        },{
          name: 'disable_all_triggers', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'disable_triggers_on_table',
          category: gettext('Trigger(s)'), priority: 4, label: gettext('Disable All'),
          icon: 'fa fa-times', enable : 'canCreate_with_trigger_disable',
          data: {
            data_disabled: gettext('The selected tree node does not support this option.'),
          },
        },{
          name: 'reset_table_stats', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'reset_table_stats',
          category: 'Reset', priority: 4, label: gettext('Reset Statistics'),
          icon: 'fa fa-chart-bar', enable : 'canCreate',
        },{
          name: 'detach_partition', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'detach_partition',
          priority: 2, label: gettext('Detach Partition'),
          icon: 'fa fa-remove',
        },{
          name: 'count_table_rows', node: 'partition', module: pgBrowser.Nodes['table'],
          applies: ['object', 'context'], callback: 'count_table_rows',
          category: 'Count', priority: 2, label: gettext('Count Rows'),
          enable: true,
        }]);
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
          info || {} : pgBrowser.tree.getTreeNodeHierarchy(item);

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
            d = i  ? t.itemData(i) : undefined;

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
                Notify.success(res.info);
                t.unload(i);
                t.setInode(i);
                t.deselect(i);
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
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          Notify.confirm(
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
                      Notify.success(res.info);
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
                    Notify.pgRespErrorNotify(xhr, error);
                    t.unload(i);
                  });
              }},
          );
        },
        reset_table_stats: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          Notify.confirm(
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
                      Notify.success(res.info);
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
                    Notify.pgRespErrorNotify(xhr, error);
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
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          Notify.confirm(
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
                      Notify.success(res.info);
                      var n = t.next(i);
                      if (!n) {
                        n = t.prev(i);
                        if (!n) {
                          n = t.parent(i);
                        }
                      }
                      t.remove(i);
                      if (n) {
                        t.select(n);
                      }
                    }
                  })
                  .fail(function(xhr, status, error) {
                    Notify.pgRespErrorNotify(xhr, error);
                  });
              }
            },
            function() {}
          );
        },
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return getNodePartitionTableSchema(treeNodeInfo, itemNodeData, pgBrowser);
      },
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,
          oid: undefined,
          description: undefined,
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
          mode: ['properties', 'create', 'edit'],
        },{
          id: 'oid', label: gettext('OID'), type: 'text', mode: ['properties'],
        },{
          id: 'schema', label: gettext('Schema'), type: 'text', node: 'schema',
          mode: ['create', 'edit', 'properties'],
        },{
          id: 'is_partitioned', label:gettext('Partitioned table?'), cell: 'switch',
          type: 'switch', mode: ['properties', 'create', 'edit'],
        },{
          id: 'partition_value', label:gettext('Partition Scheme'),
          type: 'text', visible: false,
        },{
          id: 'description', label: gettext('Comment'), type: 'multiline',
          mode: ['properties', 'create', 'edit'],
        }],
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
