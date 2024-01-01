/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName, getNodeListById} from '../../../../../../../static/js/node_ajax';
import FunctionSchema from './function.ui';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import { getNodeVariableSchema } from '../../../../../static/js/variable.ui';

/* Create and Register Function Collection and Node. */
define('pgadmin.node.function', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, pgBrowser, schemaChild, schemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-function']) {
    pgBrowser.Nodes['coll-function'] =
      pgBrowser.Collection.extend({
        node: 'function',
        label: gettext('Functions'),
        type: 'coll-function',
        columns: ['name', 'funcowner', 'description'],
        hasStatistics: true,
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }
  if (!pgBrowser.Nodes['function']) {

    pgBrowser.Nodes['function'] = schemaChild.SchemaChildNode.extend({
      type: 'function',
      sqlAlterHelp: 'sql-alterfunction.html',
      sqlCreateHelp: 'sql-createfunction.html',
      dialogHelp: url_for('help.static', {'filename': 'function_dialog.html'}),
      label: gettext('Function'),
      collection_type: 'coll-function',
      hasSQL: true,
      hasDepends: true,
      width: pgBrowser.stdW.md + 'px',
      hasStatistics: true,
      hasScriptTypes: ['create', 'select'],
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_function_on_coll', node: 'coll-function', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Function...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_function', node: 'function', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Function...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_function', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Function...'),
          data: {action: 'create', check: false}, enable: 'canCreate',
        },
        ]);

      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new FunctionSchema(
          (privileges)=>getNodePrivilegeRoleSchema(this, treeNodeInfo, itemNodeData, privileges),
          ()=>getNodeVariableSchema(this, treeNodeInfo, itemNodeData, false, false),
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListById(pgBrowser.Nodes['schema'], treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            }
            ),
            getTypes: ()=>getNodeAjaxOptions('get_types', this, treeNodeInfo, itemNodeData),
            getLanguage: ()=>getNodeAjaxOptions('get_languages', this, treeNodeInfo, itemNodeData),
            getSupportFunctions: ()=>getNodeAjaxOptions('get_support_functions', this, treeNodeInfo, itemNodeData, {
              cacheNode: 'function'
            }),

          },
          {
            node_info: treeNodeInfo,
          },
          {
            type: pgBrowser.Nodes['function'].type,
          },
          {
            funcowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            pronamespace: treeNodeInfo.schema ? treeNodeInfo.schema._id : null,
            lanname: 'sql',
          }
        );
      },
    });
  }
  return pgBrowser.Nodes['function'];
});
