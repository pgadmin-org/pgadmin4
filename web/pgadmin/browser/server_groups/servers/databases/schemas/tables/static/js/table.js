/////////////////////////////////////////////////////////////
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeTableSchema } from './table.ui';
import Notify from '../../../../../../../../static/js/helpers/Notifier';
import _ from 'lodash';
import getApiInstance from '../../../../../../../../static/js/api_instance';

define('pgadmin.node.table', [
  'pgadmin.tables.js/enable_disable_triggers',
  'sources/gettext', 'sources/url_for', 'jquery',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child','pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection', 'pgadmin.node.column',
  'pgadmin.node.constraints',
], function(
  tableFunctions,
  gettext, url_for, $, pgAdmin, pgBrowser, SchemaChild, SchemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-table']) {
    pgBrowser.Nodes['coll-table'] =
      pgBrowser.Collection.extend({
        node: 'table',
        label: gettext('Tables'),
        type: 'coll-table',
        columns: ['name', 'relowner', 'is_partitioned', 'description'],
        hasStatistics: true,
        statsPrettifyFields: [gettext('Total Size'), gettext('Indexes size'), gettext('Table size'),
          gettext('TOAST table size'), gettext('Tuple length'),
          gettext('Dead tuple length'), gettext('Free space')],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['table']) {
    pgBrowser.Nodes['table'] = SchemaChild.SchemaChildNode.extend({
      type: 'table',
      label: gettext('Table'),
      collection_type: 'coll-table',
      hasSQL: true,
      hasDepends: true,
      hasStatistics: true,
      statsPrettifyFields: [gettext('Total Size'), gettext('Indexes size'), gettext('Table size'),
        gettext('TOAST table size'), gettext('Tuple length'),
        gettext('Dead tuple length'), gettext('Free space')],
      sqlAlterHelp: 'sql-altertable.html',
      sqlCreateHelp: 'sql-createtable.html',
      dialogHelp: url_for('help.static', {'filename': 'table_dialog.html'}),
      hasScriptTypes: ['create', 'select', 'insert', 'update', 'delete'],
      width: pgBrowser.stdW.lg + 'px',
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_table_on_coll', node: 'coll-table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('Table...'),
          data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_table', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('Table...'),
          data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_table__on_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Table...'),
          data: {action: 'create', check: false},
          enable: 'canCreate',
        },{
          name: 'truncate_table', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'truncate_table',
          category: gettext('Truncate'), priority: 3, label: gettext('Truncate'),
          enable : 'canCreate',
        },{
          name: 'truncate_table_cascade', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'truncate_table_cascade',
          category: gettext('Truncate'), priority: 3, label: gettext('Truncate Cascade'),
          enable : 'canCreate',
        },{
          name: 'truncate_table_identity', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'truncate_table_identity',
          category: gettext('Truncate'), priority: 3, label: gettext('Truncate Restart Identity'),
          enable : 'canCreate',
        },{
          // To enable/disable all triggers for the table
          name: 'enable_all_triggers', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'enable_triggers_on_table',
          category: gettext('Trigger(s)'), priority: 4, label: gettext('Enable All'),
          enable : 'canCreate_with_trigger_enable',
          data: {
            data_disabled: gettext('The selected tree node does not support this option.'),
          },
        },{
          name: 'disable_all_triggers', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'disable_triggers_on_table',
          category: gettext('Trigger(s)'), priority: 4, label: gettext('Disable All'),
          enable : 'canCreate_with_trigger_disable',
          data: {
            data_disabled: gettext('The selected tree node does not support this option.'),
          },
        },{
          name: 'reset_table_stats', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'reset_table_stats',
          category: 'Reset', priority: 4, label: gettext('Reset Statistics'),
          enable : 'canCreate',
        },{
          name: 'count_table_rows', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'count_table_rows',
          category: 'Count', priority: 2, label: gettext('Count Rows'),
          enable: true,
        },{
          name: 'generate_erd', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'generate_erd',
          category: 'erd', priority: 5, label: gettext('ERD For Table'),
        }
        ]);
        pgBrowser.Events.on(
          'pgadmin:browser:node:table:updated', this.onTableUpdated.bind(this)
        );
        pgBrowser.Events.on(
          'pgadmin:browser:node:type:cache_cleared',
          this.handle_cache.bind(this)
        );
        pgBrowser.Events.on(
          'pgadmin:browser:node:domain:cache_cleared',
          this.handle_cache.bind(this)
        );
      },
      callbacks: {
        /* Enable trigger(s) on table */
        enable_triggers_on_table: function(args) {
          tableFunctions.enableTriggers(
            pgBrowser.tree,
            Notify,
            this.generate_url.bind(this),
            args
          );
        },
        /* Disable trigger(s) on table */
        disable_triggers_on_table: function(args) {
          tableFunctions.disableTriggers(
            pgBrowser.tree,
            Notify,
            this.generate_url.bind(this),
            args
          );
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
        truncate_table_identity: function(args) {
          let params = {'identity': true };
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

          Notify.confirm(
            gettext('Truncate Table'),
            gettext('Are you sure you want to truncate table %s?', d.label),
            function () {
              let data = d;
              getApiInstance().put(obj.generate_url(i, 'truncate' , d, true), params)
                .then(({data: res})=>{
                  if (res.success == 1) {
                    Notify.success(res.info);
                    t.removeIcon(i);
                    data.icon = data.is_partitioned ? 'icon-partition': 'icon-table';
                    t.addIcon(i, {icon: data.icon});
                    t.updateAndReselectNode(i, data);
                  }
                  if (res.success == 2) {
                    Notify.error(res.info);
                  }
                })
                .catch((error)=>{
                  Notify.pgRespErrorNotify(error);
                  t.refresh(i);
                });
            }, function() {/*This is intentional (SonarQube)*/}
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

          Notify.confirm(
            gettext('Reset statistics'),
            gettext('Are you sure you want to reset the statistics for table "%s"?', d._label),
            function () {
              let data = d;
              getApiInstance().delete(obj.generate_url(i, 'reset' , d, true))
                .then(({data: res})=>{
                  if (res.success == 1) {
                    Notify.success(res.info);
                    t.removeIcon(i);
                    data.icon = data.is_partitioned ? 'icon-partition': 'icon-table';
                    t.addIcon(i, {icon: data.icon});
                    t.updateAndReselectNode(i, d);
                  }
                })
                .catch((error)=>{
                  Notify.pgRespErrorNotify(error);
                  t.refresh(i);
                });
            },
            function() {/*This is intentional (SonarQube)*/}
          );
        },
        count_table_rows: function(args) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;
          if (!d)
            return false;

          /* Set the type to table so that partition module can call this func */
          let newD = {
            ...d, _type: this.type,
          };
          // Fetch the total rows of a table
          getApiInstance().get(obj.generate_url(i, 'count_rows' , newD, true))
            .then(({data: res})=>{
              Notify.success(res.info, null);
              d.rows_cnt = res.data.total_rows;
              t.updateAndReselectNode(i, d);
            })
            .catch((error)=>{
              Notify.pgRespErrorNotify(error);
              t.refresh(i);
            });
        },
        /* Generate the ERD */
        generate_erd: function(args) {
          let input = args || {},
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i ? t.itemData(i) : undefined;
          pgAdmin.Tools.ERD.showErdTool(d, i, true);
        },
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return getNodeTableSchema(treeNodeInfo, itemNodeData, pgBrowser);
      },
      // Check to whether table has disable trigger(s)
      canCreate_with_trigger_enable: function(itemData) {
        return itemData.tigger_count > 0 && (itemData.has_enable_triggers == 0 || itemData.has_enable_triggers <  itemData.tigger_count);
      },
      // Check to whether table has enable trigger(s)
      canCreate_with_trigger_disable: function(itemData) {
        return itemData.tigger_count > 0 && itemData.has_enable_triggers > 0;
      },
      onTableUpdated: function(_node, _oldNodeData, _newNodeData) {
        let key, childIDs;
        if (

          _newNodeData.is_partitioned &&
            'affected_partitions' in _newNodeData
        ) {
          let partitions = _newNodeData.affected_partitions,
            newPartitionsIDs = [],
            insertChildTreeNodes = [],
            insertChildrenNodes = function() {
              if (!insertChildTreeNodes.length)
                return;
              let option = insertChildTreeNodes.pop();
              pgBrowser.addChildTreeNodes(
                option.treeHierarchy, option.parent, option.type,
                option.childrenIDs, insertChildrenNodes
              );
            }, schemaNode ;

          if ('detached' in partitions && partitions.detached.length > 0) {
            // Remove it from the partition collections node first
            pgBrowser.removeChildTreeNodesById(
              _node, 'coll-partition', _.map(
                partitions.detached, function(_d) { return parseInt(_d.oid); }
              )
            );

            schemaNode = pgBrowser.findParentTreeNodeByType(
              _node, 'schema'
            );
            let detachedBySchema = _.groupBy(
              partitions.detached,
              function(_d) { return parseInt(_d.schema_id); }
            );

            for (key in detachedBySchema) {
              schemaNode = pgBrowser.findSiblingTreeNode(schemaNode, key);

              if (schemaNode) {
                childIDs = _.map(
                  detachedBySchema[key],
                  function(_d) { return parseInt(_d.oid); }
                );

                let tablesCollNode = pgBrowser.findChildCollectionTreeNode(
                  schemaNode, 'coll-table'
                );

                if (tablesCollNode) {
                  insertChildTreeNodes.push({
                    'parent': tablesCollNode,
                    'type': 'table',
                    'treeHierarchy':
                      pgAdmin.Browser.tree.getTreeNodeHierarchy(
                        schemaNode
                      ),
                    'childrenIDs': _.clone(childIDs),
                  });
                }
              }
            }
          }

          if ('attached' in partitions && partitions.attached.length > 0) {
            schemaNode = pgBrowser.findParentTreeNodeByType(
              _node, 'schema'
            );
            let attachedBySchema = _.groupBy(
              partitions.attached,
              function(_d) { return parseInt(_d.schema_id); }
            );

            for (key in attachedBySchema) {
              schemaNode = pgBrowser.findSiblingTreeNode(schemaNode, key);

              if (schemaNode) {
                childIDs = _.map(
                  attachedBySchema[key],
                  function(_d) { return parseInt(_d.oid); }
                );
                // Remove it from the table collections node first
                pgBrowser.removeChildTreeNodesById(
                  schemaNode, 'coll-table', childIDs
                );
              }
              newPartitionsIDs = newPartitionsIDs.concat(childIDs);
            }
          }

          if ('created' in partitions && partitions.created.length > 0) {
            _.each(partitions.created, function(_data) {
              newPartitionsIDs.push(_data.oid);
            });
          }

          if (newPartitionsIDs.length) {
            let partitionsCollNode = pgBrowser.findChildCollectionTreeNode(
              _node, 'coll-partition'
            );

            if (partitionsCollNode) {
              insertChildTreeNodes.push({
                'parent': partitionsCollNode,
                'type': 'partition',
                'treeHierarchy': pgAdmin.Browser.tree.getTreeNodeHierarchy(_node),
                'childrenIDs': newPartitionsIDs,
              });
            }
          }
          insertChildrenNodes();
        }
      },
      handle_cache: function() {
        // Clear Table's cache as column's type is dependent on two node
        // 1) Type node 2) Domain node
        this.clear_cache.apply(this, null);
      },
    });
  }

  return pgBrowser.Nodes['table'];
});
