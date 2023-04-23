/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName, getNodeListById} from '../../../../../../../static/js/node_ajax';
import FunctionSchema from './function.ui';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import { getNodeVariableSchema } from '../../../../../static/js/variable.ui';

/* Create and Register Procedure Collection and Node. */
define('pgadmin.node.procedure', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.node.schema.dir/child',
  'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser, schemaChild, schemaChildTreeNode) {

  if (!pgBrowser.Nodes['coll-procedure']) {
    pgAdmin.Browser.Nodes['coll-procedure'] =
      pgAdmin.Browser.Collection.extend({
        node: 'procedure',
        label: gettext('Procedures'),
        type: 'coll-procedure',
        columns: ['name', 'funcowner', 'description'],
        hasStatistics: true,
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Inherit Functions Node
  if (!pgBrowser.Nodes['procedure']) {
    pgAdmin.Browser.Nodes['procedure'] = schemaChild.SchemaChildNode.extend({
      type: 'procedure',
      sqlAlterHelp: 'sql-alterprocedure.html',
      sqlCreateHelp: 'sql-createprocedure.html',
      dialogHelp: url_for('help.static', {'filename': 'procedure_dialog.html'}),
      label: gettext('Procedure'),
      collection_type: 'coll-procedure',
      hasSQL: true,
      hasDepends: true,
      hasStatistics: true,
      hasScriptTypes: ['create', 'exec'],
      width: pgBrowser.stdW.md + 'px',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.proc_initialized)
          return;

        this.proc_initialized = true;

        pgBrowser.add_menus([{
          name: 'create_procedure_on_coll', node: 'coll-procedure', module:
          this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Procedure...'),
          data: {action: 'create', check: false}, enable: 'canCreateProc',
        },{
          name: 'create_procedure', node: 'procedure', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Procedure...'),
          data: {action: 'create', check: true}, enable: 'canCreateProc',
        },{
          name: 'create_procedure', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Procedure...'),
          data: {action: 'create', check: true}, enable: 'canCreateProc',
        },
        ]);
      },
      canCreateProc: function(itemData, item) {
        let node_hierarchy = pgBrowser.tree.getTreeNodeHierarchy(item);

        // Do not provide Create option in catalog
        if ('catalog' in node_hierarchy)
          return false;

        // Procedures supported only in PPAS and PG >= 11
        return (
          'server' in node_hierarchy && (
            node_hierarchy['server'].server_type == 'ppas' ||
            (node_hierarchy['server'].server_type == 'pg' &&
             node_hierarchy['server'].version >= 110000)
          )
        );
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
            type: pgBrowser.Nodes['procedure'].type,
          },
          {
            funcowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            pronamespace: treeNodeInfo.schema ? treeNodeInfo.schema._id : null,
            lanname:  treeNodeInfo.server.server_type != 'ppas' ? 'sql' : 'edbspl',
          }
        );
      },

    });

  }

  return pgBrowser.Nodes['procedure'];
});
