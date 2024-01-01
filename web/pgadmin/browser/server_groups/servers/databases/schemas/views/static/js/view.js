/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeListByName } from '../../../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import ViewSchema from './view.ui';

define('pgadmin.node.view', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.node.rule',
], function(
  gettext, url_for, pgBrowser, schemaChild, schemaChildTreeNode
) {


  /**
    Create and add a view collection into nodes
    @param {variable} label - Label for Node
    @param {variable} type - Type of Node
    @param {variable} columns - List of columns to
      display under under properties.
   */
  if (!pgBrowser.Nodes['coll-view']) {
    pgBrowser.Nodes['coll-view'] =
      pgBrowser.Collection.extend({
        node: 'view',
        label: gettext('Views'),
        type: 'coll-view',
        columns: ['name', 'owner', 'comment'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  /**
    Create and Add a View Node into nodes
    @param {variable} parent_type - The list of nodes
    under which this node to display
    @param {variable} type - Type of Node
    @param {variable} hasSQL - To show SQL tab
   */
  if (!pgBrowser.Nodes['view']) {
    pgBrowser.Nodes['view'] = schemaChild.SchemaChildNode.extend({
      type: 'view',
      sqlAlterHelp: 'sql-alterview.html',
      sqlCreateHelp: 'sql-createview.html',
      dialogHelp: url_for('help.static', {'filename': 'view_dialog.html'}),
      label: gettext('View'),
      hasSQL:  true,
      hasDepends: true,
      hasScriptTypes: ['create', 'select', 'insert'],
      collection_type: 'coll-view',
      Init: function() {

        // Avoid mulitple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        /**
          Add "create view" menu option into context and object menu
          for the following nodes:
          coll-view, view and schema.
          @property {data} - Allow create view option on schema node or
          system view nodes.
          */
        pgBrowser.add_menus([{
          name: 'create_view_on_coll', node: 'coll-view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('View...'),
          data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_view', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('View...'),
          data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_view', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 17, label: gettext('View...'),
          data: {action: 'create', check: false},
          enable: 'canCreate',
        },
        ]);
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new ViewSchema(
          (privileges)=>getNodePrivilegeRoleSchema('', treeNodeInfo, itemNodeData, privileges),
          treeNodeInfo,
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListByName('schema', treeNodeInfo, itemNodeData, {cacheLevel: 'database'}),
          },
          {
            owner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            schema: treeNodeInfo.schema ? treeNodeInfo.schema.label : ''
          }
        );
      },
    });
  }

  return pgBrowser.Nodes['view'];
});
