/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import CollationSchema from './collation.ui';
import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../../static/js/node_ajax';

define('pgadmin.node.collation', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser, schemaChild,
  schemaChildTreeNode) {

  if (!pgBrowser.Nodes['coll-collation']) {
    pgAdmin.Browser.Nodes['coll-collation'] =
      pgAdmin.Browser.Collection.extend({
        node: 'collation',
        label: gettext('Collations'),
        type: 'coll-collation',
        columns: ['name', 'owner', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['collation']) {
    pgAdmin.Browser.Nodes['collation'] = schemaChild.SchemaChildNode.extend({
      type: 'collation',
      sqlAlterHelp: 'sql-altercollation.html',
      sqlCreateHelp: 'sql-createcollation.html',
      dialogHelp: url_for('help.static', {'filename': 'collation_dialog.html'}),
      label: gettext('Collation'),
      collection_type: 'coll-collation',
      hasSQL: true,
      hasDepends: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_collation_on_coll', node: 'coll-collation', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Collation...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_collation', node: 'collation', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Collation...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_collation', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Collation...'),
          data: {action: 'create', check: false}, enable: 'canCreate',
        },
        ]);

      },
      getSchema: (treeNodeInfo, itemNodeData)=>{
        let nodeObj = pgAdmin.Browser.Nodes['collation'];
        return new CollationSchema(
          {
            rolesList: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData, {cacheLevel: 'server'}),
            schemaList: ()=>getNodeListByName('schema', treeNodeInfo, itemNodeData, {cacheLevel: 'database'}),
            collationsList: ()=>getNodeAjaxOptions('get_collations', nodeObj, treeNodeInfo, itemNodeData, {cacheLevel: 'server'})
          },
          {
            owner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            schema: ('schema' in treeNodeInfo)? treeNodeInfo.schema.label : ''
          }
        );
      }
    });
  }
  return pgBrowser.Nodes['collation'];
});
