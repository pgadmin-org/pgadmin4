/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import TriggerFunctionSchema from './trigger_function.ui';
import { getNodeListByName, getNodeListById, getNodeAjaxOptions } from '../../../../../../../static/js/node_ajax';
import { getNodeVariableSchema } from '../../../../../static/js/variable.ui';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import _ from 'lodash';

/* Create and Register Function Collection and Node. */
define('pgadmin.node.trigger_function', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, pgBrowser, schemaChild, schemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-trigger_function']) {
    pgBrowser.Nodes['coll-trigger_function'] =
      pgBrowser.Collection.extend({
        node: 'trigger_function',
        label: gettext('Trigger functions'),
        type: 'coll-trigger_function',
        columns: ['name', 'funcowner', 'description'],
        hasStatistics: true,
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['trigger_function']) {
    pgBrowser.Nodes['trigger_function'] = schemaChild.SchemaChildNode.extend({
      type: 'trigger_function',
      sqlAlterHelp: 'plpgsql-trigger.html',
      sqlCreateHelp: 'plpgsql-trigger.html',
      dialogHelp: url_for('help.static', {'filename': 'trigger_function_dialog.html'}),
      label: gettext('Trigger function'),
      collection_type: 'coll-trigger_function',
      canEdit: function(itemData, item) {
        let node = pgBrowser.tree.findNodeByDomElement(item);

        return !(!node || node.parentNode.getData()._type === 'trigger');
      },
      hasSQL: true,
      showMenu: function(itemData, item) {
        return this.canEdit(itemData, item);
      },
      hasDepends: true,
      hasStatistics: true,
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_trigger_function_on_coll', node: 'coll-trigger_function', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger function...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_trigger_function', node: 'trigger_function', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger function...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_trigger_function', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Trigger function...'),
          data: {action: 'create', check: false}, enable: 'canCreate',
        },
        ]);
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new TriggerFunctionSchema(
          (privileges)=>getNodePrivilegeRoleSchema('', treeNodeInfo, itemNodeData, privileges),
          ()=>getNodeVariableSchema(this, treeNodeInfo, itemNodeData, false, false),
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListById(pgBrowser.Nodes['schema'], treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            }),
            language: ()=>getNodeAjaxOptions('get_languages', this, treeNodeInfo, itemNodeData, {noCache: true}, (res) => {
              return _.reject(res, function(o) {
                return o.label == 'sql';
              });
            }),
            nodeInfo: treeNodeInfo
          },
          {
            funcowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            pronamespace: treeNodeInfo.schema ? treeNodeInfo.schema._id : null
          }
        );
      },
    });

  }

  return pgBrowser.Nodes['trigger_function'];
});
