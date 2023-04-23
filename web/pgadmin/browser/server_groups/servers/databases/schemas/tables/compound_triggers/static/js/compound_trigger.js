/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeListByName } from '../../../../../../../../static/js/node_ajax';
import CompoundTriggerSchema from './compound_trigger.ui';
import Notify from '../../../../../../../../../static/js/helpers/Notifier';
import getApiInstance from '../../../../../../../../../static/js/api_instance';

define('pgadmin.node.compound_trigger', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, pgAdmin, pgBrowser, SchemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-compound_trigger']) {
    pgAdmin.Browser.Nodes['coll-compound_trigger'] =
      pgAdmin.Browser.Collection.extend({
        node: 'compound_trigger',
        label: gettext('Compound Triggers'),
        type: 'coll-compound_trigger',
        columns: ['name', 'description'],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['compound_trigger']) {
    pgAdmin.Browser.Nodes['compound_trigger'] = pgBrowser.Node.extend({
      parent_type: ['table', 'view', 'partition'],
      collection_type: ['coll-table', 'coll-view'],
      type: 'compound_trigger',
      label: gettext('Compound Trigger'),
      hasSQL:  true,
      hasDepends: true,
      width: pgBrowser.stdW.sm + 'px',
      epasHelp: true,
      dialogHelp: url_for('help.static', {'filename': 'compound_trigger_dialog.html'}),
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_compound_trigger_on_coll', node: 'coll-compound_trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Compound Trigger...'),
          data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },{
          name: 'create_compound_trigger', node: 'compound_trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Compound Trigger...'),
          data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },{
          name: 'create_compound_trigger_onTable', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Compound Trigger...'),
          data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },{
          name: 'create_compound_trigger_onPartition', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Compound Trigger...'),
          data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },{
          name: 'enable_compound_trigger', node: 'compound_trigger', module: this,
          applies: ['object', 'context'], callback: 'enable_compound_trigger',
          category: 'connect', priority: 3, label: gettext('Enable compound trigger'),
          enable : 'canCreate_with_compound_trigger_enable',
        },{
          name: 'disable_compound_trigger', node: 'compound_trigger', module: this,
          applies: ['object', 'context'], callback: 'disable_compound_trigger',
          category: 'drop', priority: 3, label: gettext('Disable compound trigger'),
          enable : 'canCreate_with_compound_trigger_disable',
        },{
          name: 'create_compound_trigger_onView', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Compound Trigger...'),
          data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },
        ]);
      },
      callbacks: {
        /* Enable compound trigger */
        enable_compound_trigger: function(args) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i ? t.itemData(i) : undefined;

          if (!d)
            return false;

          let data = d;
          getApiInstance().put(
            obj.generate_url(i, 'enable' , d, true),
            {'is_enable_trigger' : 'O'}
          ).then(({data: res})=> {
            if(res.success == 1) {
              Notify.success(res.info);
              t.removeIcon(i);
              data.icon = 'icon-compound_trigger';
              t.addIcon(i, {icon: data.icon});
              t.unload(i);
              t.setInode(false);
              t.deselect(i);
              // Fetch updated data from server
              setTimeout(function() {
                t.select(i);
              }, 10);
            }
          }).catch(function(error) {
            Notify.pgRespErrorNotify(error);
            t.unload(i);
          });
        },
        /* Disable compound trigger */
        disable_compound_trigger: function(args) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (!d)
            return false;

          let data = d;
          getApiInstance().put(
            obj.generate_url(i, 'enable' , d, true),
            {'is_enable_trigger' : 'D'}
          ).then(({data: res})=> {
            if(res.success == 1) {
              Notify.success(res.info);
              t.removeIcon(i);
              data.icon = 'icon-compound_trigger-bad';
              t.addIcon(i, {icon: data.icon});
              t.unload(i);
              t.setInode(false);
              t.deselect(i);
              // Fetch updated data from server
              setTimeout(function() {
                t.select(i);
              }, 10);
            }
          }).catch(function(error) {
            Notify.pgRespErrorNotify(error);
            t.unload(i);
          });
        },
      },
      canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new CompoundTriggerSchema(
          {
            columns: ()=>getNodeListByName('column', treeNodeInfo, itemNodeData, { cacheLevel: 'column'}),
          },
          treeNodeInfo,
        );
      },

      canCreate: function(itemData, item, data) {
        //If check is false then , we will allow create menu
        if (data && !data.check)
          return true;

        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
          server = treeData['server'];

        if (server && (server.server_type === 'pg' || server.version < 120000))
          return false;

        // If it is catalog then don't allow user to create package
        return treeData['catalog'] == undefined;
      },
      // Check to whether trigger is disable ?
      canCreate_with_compound_trigger_enable: function(itemData, item, data) {
        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item);
        if ('view' in treeData) {
          return false;
        }

        return itemData.icon === 'icon-compound_trigger-bad' &&
          this.canCreate.apply(this, [itemData, item, data]);
      },
      // Check to whether trigger is enable ?
      canCreate_with_compound_trigger_disable: function(itemData, item, data) {
        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item);
        if ('view' in treeData) {
          return false;
        }

        return itemData.icon === 'icon-compound_trigger' &&
          this.canCreate.apply(this, [itemData, item, data]);
      },
    });
  }

  return pgBrowser.Nodes['compound_trigger'];
});
