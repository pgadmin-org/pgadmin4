/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { getNodeListByName, getNodeAjaxOptions } from '../../../../../../../../static/js/node_ajax';
import TriggerSchema from './trigger.ui';
import _ from 'lodash';
import getApiInstance from '../../../../../../../../../static/js/api_instance';

define('pgadmin.node.trigger', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, pgAdmin, pgBrowser, SchemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-trigger']) {
    pgAdmin.Browser.Nodes['coll-trigger'] =
      pgAdmin.Browser.Collection.extend({
        node: 'trigger',
        label: gettext('Triggers'),
        type: 'coll-trigger',
        columns: ['name', 'description'],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['trigger']) {
    pgAdmin.Browser.Nodes['trigger'] = pgBrowser.Node.extend({
      parent_type: ['table', 'view', 'partition', 'foreign_table'],
      collection_type: ['coll-table', 'coll-view','coll-foreign_table'],
      type: 'trigger',
      label: gettext('Trigger'),
      hasSQL:  true,
      hasDepends: true,
      width: pgBrowser.stdW.sm + 'px',
      sqlAlterHelp: 'sql-altertrigger.html',
      sqlCreateHelp: 'sql-createtrigger.html',
      dialogHelp: url_for('help.static', {'filename': 'trigger_dialog.html'}),
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_trigger_on_coll', node: 'coll-trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger...'),
          data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_trigger', node: 'trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger...'),
          data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_trigger_onTable', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger...'),
          data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_trigger_onPartition', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger...'),
          data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'enable_trigger', node: 'trigger', module: this,
          applies: ['object', 'context'], callback: 'enable_trigger',
          category: 'connect', priority: 3, label: gettext('Enable'),
          enable : 'canCreate_with_trigger_enable',
        },{
          name: 'disable_trigger', node: 'trigger', module: this,
          applies: ['object', 'context'], callback: 'disable_trigger',
          category: 'drop', priority: 3, label: gettext('Disable'),
          enable : 'canCreate_with_trigger_disable',
        },{
          name: 'create_trigger_onView', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger...'),
          data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_trigger_onForeignTable', node: 'foreign_table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 3, label: gettext('Trigger...'),
          data: {action: 'create', check: true},
          enable: 'canCreate',
        }
        ]);
      },
      callbacks: {
        /* Enable trigger */
        enable_trigger: function(args) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          let data = d;
          getApiInstance().put(obj.generate_url(i, 'enable' , d, true), {'is_enable_trigger' : 'O'})
            .then(({data: res})=>{
              if (res.success == 1) {
                pgAdmin.Browser.notifier.success(res.info);
                t.removeIcon(i);
                data.icon = 'icon-trigger';
                data.has_enable_triggers =  res.data.has_enable_triggers;
                t.addIcon(i, {icon: data.icon});
                t.updateAndReselectNode(i, data);
              }
            })
            .catch((error)=>{
              pgAdmin.Browser.notifier.pgRespErrorNotify(error);
              t.refresh(i);
            });
        },
        /* Disable trigger */
        disable_trigger: function(args) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          let data = d;
          getApiInstance().put(obj.generate_url(i, 'enable' , d, true), {'is_enable_trigger' : 'D'})
            .then(({data: res})=>{
              if (res.success == 1) {
                pgAdmin.Browser.notifier.success(res.info);
                t.removeIcon(i);
                data.icon = 'icon-trigger-bad';
                data.has_enable_triggers = res.data.has_enable_triggers;
                t.addIcon(i, {icon: data.icon});
                t.updateAndReselectNode(i, data);
              }
            })
            .catch((error)=>{
              pgAdmin.Browser.notifier.pgRespErrorNotify(error);
              t.refresh(i);
            });
        },
      },
      canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new TriggerSchema(
          {
            triggerFunction: ()=>getNodeAjaxOptions('get_triggerfunctions', this, treeNodeInfo, itemNodeData, {cacheLevel: 'trigger_function', jumpAfterNode: 'schema'}, (data) => {
              return _.reject(data, function(option) {
                return option.label == '';
              });
            }),
            columns: ()=> getNodeListByName('column', treeNodeInfo, itemNodeData, { cacheLevel: 'column'}),
            nodeInfo: treeNodeInfo
          },
        );
      },
      canCreate: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      // Check to whether trigger is disable ?
      canCreate_with_trigger_enable: function(itemData, item, data) {
        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item);
        if ('view' in treeData) {
          return false;
        }

        return itemData.icon === 'icon-trigger-bad' &&
          this.canCreate.apply(this, [itemData, item, data]);
      },
      // Check to whether trigger is enable ?
      canCreate_with_trigger_disable: function(itemData, item, data) {
        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item);
        if ('view' in treeData) {
          return false;
        }

        return itemData.icon === 'icon-trigger' &&
          this.canCreate.apply(this, [itemData, item, data]);
      },
    });
  }

  return pgBrowser.Nodes['trigger'];
});
