/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import RowSecurityPolicySchema from './row_security_policy.ui';
import { getNodeListByName } from '../../../../../../../../static/js/node_ajax';


define('pgadmin.node.row_security_policy', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, pgAdmin, pgBrowser, SchemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-row_security_policy']) {
    pgAdmin.Browser.Nodes['coll-row_security_policy'] =
      pgAdmin.Browser.Collection.extend({
        node: 'row_security_policy',
        label: gettext('RLS Policies'),
        type: 'coll-row_security_policy',
        columns: ['name', 'description'],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['row_security_policy']) {
    pgAdmin.Browser.Nodes['row_security_policy'] = pgBrowser.Node.extend({
      parent_type: ['table', 'view', 'partition'],
      collection_type: ['coll-table', 'coll-view'],
      type: 'row_security_policy',
      label: gettext('RLS Policy'),
      hasSQL:  true,
      hasDepends: true,
      width: pgBrowser.stdW.sm + 'px',
      sqlAlterHelp: 'sql-alterpolicy.html',
      sqlCreateHelp: 'sql-createpolicy.html',
      dialogHelp: url_for('help.static', {'filename': 'rls_policy_dialog.html'}),
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_row_security_policy_on_coll', node: 'coll-row_security_policy', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('RLS Policy...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_row_security_policy', node: 'row_security_policy', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('RLS Policy...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },
        {
          name: 'create_row_security_policy_on_coll', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 6, label: gettext('RLS Policy...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },
        ]);
      },
      canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new RowSecurityPolicySchema(
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData, {}, ()=>true, (res)=>{
              res.unshift({label: 'PUBLIC', value: 'public'});
              return res;
            }),
            nodeInfo: treeNodeInfo
          }
        );
      },
      canCreate: function(itemData, item) {

        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
          server = treeData['server'];

        // If node is under catalog then do not allow 'create' menu
        if (treeData['catalog'] != undefined)
          return false;

        // If server is less than 9.5 then do not allow 'create' menu
        return server && server.version >= 90500;
      },
    });
  }

  return pgBrowser.Nodes['row_security_policy'];
});
