/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { getNodeListByName, getNodeAjaxOptions } from '../../../../../../../static/js/node_ajax';
import { getNodeVariableSchema } from '../../../../../static/js/variable.ui';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import ForeignTableSchema from './foreign_table.ui';
import _ from 'lodash';
import Notify from '../../../../../../../../static/js/helpers/Notifier';
import getApiInstance from '../../../../../../../../static/js/api_instance';

/* Create and Register Foreign Table Collection and Node. */
define('pgadmin.node.foreign_table', ['pgadmin.tables.js/enable_disable_triggers',
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection','pgadmin.node.column',
  'pgadmin.node.constraints'
], function(
  tableFunctions, gettext, url_for, pgBrowser, schemaChild, schemaChildTreeNode,
) {

  if (!pgBrowser.Nodes['coll-foreign_table']) {
    pgBrowser.Nodes['coll-foreign_table'] =
      pgBrowser.Collection.extend({
        node: 'foreign_table',
        label: gettext('Foreign Tables'),
        type: 'coll-foreign_table',
        columns: ['name', 'owner', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['foreign_table']) {
    pgBrowser.Nodes['foreign_table'] = schemaChild.SchemaChildNode.extend({
      type: 'foreign_table',
      sqlAlterHelp: 'sql-alterforeigntable.html',
      sqlCreateHelp: 'sql-createforeigntable.html',
      dialogHelp: url_for('help.static', {'filename': 'foreign_table_dialog.html'}),
      label: gettext('Foreign Table'),
      collection_type: 'coll-foreign_table',
      hasSQL: true,
      hasDepends: true,
      width: pgBrowser.stdW.md + 'px',
      hasScriptTypes: ['create', 'select', 'insert', 'update', 'delete'],
      parent_type: ['schema'],
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_foreign_table_on_coll', node: 'coll-foreign_table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Table...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
          shortcut_preference: ['browser', 'sub_menu_create'],
        },{
          name: 'create_foreign_table', node: 'foreign_table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Table...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
          shortcut_preference: ['browser', 'sub_menu_create'],
        },{
          name: 'create_foreign_table', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Table...'),
          data: {action: 'create', check: false}, enable: 'canCreate',
        },{
          name: 'truncate_foreign_table', node: 'foreign_table', module: this,
          applies: ['object', 'context'], callback: 'truncate_foreign_table',
          category: gettext('Truncate'), priority: 3, label: gettext('Truncate'),
          enable : 'canCreate',
        },{
          name: 'truncate_foreign_table_cascade', node: 'foreign_table', module: this,
          applies: ['object', 'context'], callback: 'truncate_foreign_table_cascade',
          category: gettext('Truncate'), priority: 3, label: gettext('Truncate Cascade'),
          enable : 'canCreate',
        },{
          name: 'truncate_foreign_table_identity', node: 'foreign_table', module: this,
          applies: ['object', 'context'], callback: 'truncate_foreign_table_identity',
          category: gettext('Truncate'), priority: 3, label: gettext('Truncate Restart Identity'),
          enable : 'canCreate',
        },{
          // To enable/disable all triggers for the table
          name: 'enable_all_triggers', node: 'foreign_table', module: this,
          applies: ['object', 'context'], callback: 'enable_triggers_on_table',
          category: gettext('Trigger(s)'), priority: 4, label: gettext('Enable All'),
          enable : 'canCreate_with_trigger_enable',
          data: {
            data_disabled: gettext('The selected tree node does not support this option.'),
            action: 'create'
          },
        },{
          name: 'disable_all_triggers', node: 'foreign_table', module: this,
          applies: ['object', 'context'], callback: 'disable_triggers_on_table',
          category: gettext('Trigger(s)'), priority: 4, label: gettext('Disable All'),
          enable : 'canCreate_with_trigger_disable',
          data: {
            data_disabled: gettext('The selected tree node does not support this option.'),
            action: 'create'
          }}
        ]);
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
        /* Truncate foreign table */
        truncate_foreign_table: function(args) {
          let params = {'cascade': false };
          this.callbacks.truncate.apply(this, [args, params]);
        },
        /* Truncate foreign table with cascade */
        truncate_foreign_table_cascade: function(args) {
          let params = {'cascade': true };
          this.callbacks.truncate.apply(this, [args, params]);
        },
        /* Truncate foreign table with identity */
        truncate_foreign_table_identity: function(args) {
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

          pgBrowser.notifier.confirm(
            gettext('Truncate Foreign Table'),
            gettext('Are you sure you want to truncate foreign table <b>%s</b>?', d.label),
            function () {
              let data = d;
              getApiInstance().put(obj.generate_url(i, 'truncate' , d, true), params)
                .then(({data: res})=>{
                  if (res.success == 1) {
                    pgBrowser.notifier.success(res.info);
                    t.removeIcon(i);
                    data.icon = data.is_partitioned ? 'icon-partition': 'icon-table';
                    t.addIcon(i, {icon: data.icon});
                    t.updateAndReselectNode(i, data);
                  }
                  if (res.success == 2) {
                    pgBrowser.notifier.error(res.info);
                  }
                })
                .catch((error)=>{
                  pgBrowser.notifier.pgRespErrorNotify(error);
                  t.refresh(i);
                });
            }, function() {/*This is intentional (SonarQube)*/}
          );
        },
      },
      // Check to whether table has disable trigger(s)
      canCreate_with_trigger_enable: function(itemData) {
        return itemData.tigger_count > 0 && (itemData.has_enable_triggers == 0 || itemData.has_enable_triggers <  itemData.tigger_count);
      },
      // Check to whether table has enable trigger(s)
      canCreate_with_trigger_disable: function(itemData) {
        return itemData.tigger_count > 0 && itemData.has_enable_triggers > 0;
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new ForeignTableSchema(
          (privileges)=>getNodePrivilegeRoleSchema('', treeNodeInfo, itemNodeData, privileges),
          ()=>getNodeVariableSchema(this, treeNodeInfo, itemNodeData, false, false),
          (params)=>{
            return getNodeAjaxOptions('get_columns', pgBrowser.Nodes['foreign_table'], treeNodeInfo, itemNodeData, {urlParams: params, useCache:false});
          },
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListByName('schema', treeNodeInfo, itemNodeData, {cacheLevel: 'database'}),
            foreignServers: ()=>getNodeAjaxOptions('get_foreign_servers', this, treeNodeInfo, itemNodeData, {cacheLevel: 'database'}, (res) => {
              return _.reject(res, function(o) {
                return o.label == '' || o.label == null;
              });
            }),
            tables: ()=>getNodeAjaxOptions('get_tables', this, treeNodeInfo, itemNodeData, {cacheLevel: 'database'}),
            nodeInfo: treeNodeInfo,
            nodeData: itemNodeData,
            pgBrowser: pgBrowser
          },
          {
            owner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            basensp: treeNodeInfo.schema ? treeNodeInfo.schema.label : ''
          }
        );
      },
    });

  }

  return pgBrowser.Nodes['foreign_table'];
});
