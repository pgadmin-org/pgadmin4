/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import PackageSchema from './package.ui';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import { getNodeListByName } from '../../../../../../../static/js/node_ajax';


define('pgadmin.node.package', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgBrowser, schemaChild, schemaChildTreeNode) {

  // Extend the browser's collection class for package collection
  if (!pgBrowser.Nodes['coll-package']) {
    pgBrowser.Nodes['coll-package'] =
      pgBrowser.Collection.extend({
        node: 'package',
        label: gettext('Packages'),
        type: 'coll-package',
        columns: ['name' ,'owner', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Extend the browser's node class for package node
  if (!pgBrowser.Nodes['package']) {
    pgBrowser.Nodes['package'] = schemaChild.SchemaChildNode.extend({
      type: 'package',
      epasHelp: true,
      dialogHelp: url_for('help.static', {'filename': 'package_dialog.html'}),
      label: gettext('Package'),
      collection_type: 'coll-package',
      hasSQL: true,
      hasDepends: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_package_on_coll', node: 'coll-package', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Package...'),
          data: {action: 'create', check: true, 
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },{
          name: 'create_package', node: 'package', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Package...'),
          data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },{
          name: 'create_package', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Package...'),
          data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },
        ]);

      },
      canCreate: function(itemData, item, data) {
        //If check is false then , we will allow create menu
        if (data && !data.check)
          return true;

        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
          server = treeData['server'];

        if (server && server.server_type === 'pg')
          return false;

        // If it is catalog then don't allow user to create package
        return treeData['catalog'] == undefined;
      },
      getSchema: (treeNodeInfo, itemNodeData) => {
        let nodeObj = pgBrowser.Nodes['package'];
        return new PackageSchema(
          (privileges)=>getNodePrivilegeRoleSchema(nodeObj, treeNodeInfo, itemNodeData, privileges),
          {
            schemas:() => getNodeListByName('schema', treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            }),
            node_info: treeNodeInfo
          }, {
            schema: treeNodeInfo.schema.label
          }
        );
      }
    });
  }

  return pgBrowser.Nodes['package'];
});
