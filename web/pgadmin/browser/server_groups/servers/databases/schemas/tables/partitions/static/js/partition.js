/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodePartitionTableSchema } from './partition.ui';
import _ from 'lodash';
import getApiInstance from '../../../../../../../../../static/js/api_instance';

define([
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'sources/utils',
  'pgadmin.browser.collection',
],
function(
  gettext, url_for, pgAdmin, pgBrowser,
  SchemaChildTreeNode, pgadminUtils
) {

  if (!pgBrowser.Nodes['coll-partition']) {
    pgAdmin.Browser.Nodes['coll-partition'] =
      pgAdmin.Browser.Collection.extend({
        node: 'partition',
        label: gettext('Partitions'),
        type: 'coll-partition',
        columns: [
          'name', 'schema', 'partition_scheme',  'partition_value', 'is_partitioned', 'description',
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
      statsPrettifyFields: [gettext('Total Size'), gettext('Indexes size'), gettext('Table size'),
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
          enable : 'canCreate',
        },{
          name: 'truncate_table_cascade', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'truncate_table_cascade',
          category: gettext('Truncate'), priority: 3, label: gettext('Truncate Cascade'),
          enable : 'canCreate',
        },{
          // To enable/disable all triggers for the table
          name: 'enable_all_triggers', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'enable_triggers_on_table',
          category: gettext('Trigger(s)'), priority: 4, label: gettext('Enable All'),
          enable : 'canCreate_with_trigger_enable',
          data: {
            data_disabled: gettext('The selected tree node does not support this option.'),
          },
        },{
          name: 'disable_all_triggers', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'disable_triggers_on_table',
          category: gettext('Trigger(s)'), priority: 4, label: gettext('Disable All'),
          enable : 'canCreate_with_trigger_disable',
          data: {
            data_disabled: gettext('The selected tree node does not support this option.'),
          },
        },{
          name: 'reset_table_stats', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'reset_table_stats',
          category: 'Reset', priority: 4, label: gettext('Reset Statistics'),
          enable : 'canCreate',
        },{
          name: 'detach_partition', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'detach_partition',
          category: gettext('Detach Partition'), priority: 2, label: gettext('Detach'),
        },{
          name: 'detach_partition_concurrently', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'detach_partition_concurrently',
          category: gettext('Detach Partition'), priority: 2, label: gettext('Concurrently'),
          enable: function(itemData, item) {
            let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
              server = treeData['server'],
              partition = treeData['partition'];

            return (server && server.version >= 140000 && !partition.is_detach_pending);
          }
        },{
          name: 'detach_partition_finalize', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'detach_partition_finalize',
          category: gettext('Detach Partition'), priority: 2, label: gettext('Finalize'),
          enable: function(itemData, item) {
            let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
              server = treeData['server'],
              partition = treeData['partition'];

            return (server && server.version >= 140000 && partition.is_detach_pending);
          }
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
      on_done: function(res, data, t, i) {
        if (res.success == 1) {
          pgAdmin.Browser.notifier.success(res.info);
          t.removeIcon(i);
          data.icon = 'icon-partition';
          t.addIcon(i, {icon: data.icon});
          t.updateAndReselectNode(i, data);
        }
      },
      canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      callbacks: {
        /* Enable trigger(s) on table */
        enable_triggers_on_table: function(args) {
          let params = {'is_enable_trigger': 'O'};
          this.callbacks.set_triggers.apply(this, [args, params]);
        },
        /* Disable trigger(s) on table */
        disable_triggers_on_table: function(args) {
          let params = {'is_enable_trigger': 'D'};
          this.callbacks.set_triggers.apply(this, [args, params]);
        },
        set_triggers: function(args, params) {
          // This function will send request to enable or
          // disable triggers on table level
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          getApiInstance().put(obj.generate_url(i, 'set_trigger' , d, true), params)
            .then(({data: res})=>{
              if (res.success == 1) {
                pgAdmin.Browser.notifier.success(res.info);
                t.updateAndReselectNode(i, d);
              }
            })
            .catch((error)=>{
              pgAdmin.Browser.notifier.pgRespErrorNotify(error);
              t.refresh(i);
            });
        },
        /* Truncate table */
        truncate_table: function(args) {
          let params = {'cascade': false };
          this.callbacks.truncate.apply(this, [args, params]);
        },
        /* Truncate table with cascade */
        truncate_table_cascade: function(args) {
          let params = {'cascade': true };
          this.callbacks.truncate.apply(this, [args, params]);
        },
        truncate: function(args, params) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          pgAdmin.Browser.notifier.confirm(
            gettext('Truncate Table'),
            gettext('Are you sure you want to truncate table %s?', d.label),
            function () {
              let data = d;
              getApiInstance().put(obj.generate_url(i, 'truncate' , d, true), params)
                .then(({data: res})=>{
                  obj.on_done(res, data, t, i);
                })
                .catch((error)=>{
                  pgAdmin.Browser.notifier.pgRespErrorNotify(error);
                  t.unload(i);
                });
            },
          );
        },
        reset_table_stats: function(args) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          pgAdmin.Browser.notifier.confirm(
            gettext('Reset statistics'),
            gettext('Are you sure you want to reset the statistics for table "%s"?', d._label),
            function () {
              let data = d;
              getApiInstance().delete(obj.generate_url(i, 'reset' , d, true))
                .then(({data: res})=>{
                  obj.on_done(res, data, t, i);
                })
                .catch((error)=>{
                  pgAdmin.Browser.notifier.pgRespErrorNotify(error);
                  t.unload(i);
                });
            },
            function() {/*This is intentional (SonarQube)*/}
          );
        },
        detach: function(args, params) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          let title = gettext('Detach Partition');

          if (params['mode'] === 'concurrently') {
            title = gettext('Detach Partition Concurrently');
          } else if (params['mode'] === 'finalize') {
            title = gettext('Detach Partition Finalize');
          }

          pgAdmin.Browser.notifier.confirm(
            title,
            gettext('Are you sure you want to detach the partition %s?', d._label),
            function () {
              getApiInstance().put(obj.generate_url(i, 'detach' , d, true), params)
                .then(({data: res})=>{
                  if (res.success == 1) {
                    pgAdmin.Browser.notifier.success(res.info);
                    let n = t.next(i);
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
                .catch((error)=>{
                  pgAdmin.Browser.notifier.pgRespErrorNotify(error);
                });
            },
            function() {/*This is intentional (SonarQube)*/}
          );
        },
        detach_partition: function(args) {
          let params = {'mode': 'detach' };
          this.callbacks.detach.apply(this, [args, params]);
        },
        detach_partition_concurrently: function(args) {
          let params = {'mode': 'concurrently' };
          this.callbacks.detach.apply(this, [args, params]);
        },
        detach_partition_finalize: function(args) {
          let params = {'mode': 'finalize' };
          this.callbacks.detach.apply(this, [args, params]);
        },
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return getNodePartitionTableSchema(treeNodeInfo, itemNodeData, pgBrowser);
      },
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
