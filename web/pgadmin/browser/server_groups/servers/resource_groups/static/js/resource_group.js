/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import ResourceGroupSchema from './resource_group.ui';

define('pgadmin.node.resource_group', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgBrowser) {

  // Extend the browser's collection class for resource group collection
  if (!pgBrowser.Nodes['coll-resource_group']) {
    pgBrowser.Nodes['coll-resource_group'] =
      pgBrowser.Collection.extend({
        node: 'resource_group',
        label: gettext('Resource Groups'),
        type: 'coll-resource_group',
        columns: ['name', 'cpu_rate_limit', 'dirty_rate_limit'],
        canDrop: true,
        canDropCascade: false,
      });
  }

  // Extend the browser's node class for resource group node
  if (!pgBrowser.Nodes['resource_group']) {
    pgBrowser.Nodes['resource_group'] = pgBrowser.Node.extend({
      parent_type: 'server',
      type: 'resource_group',
      epasHelp: true,
      dialogHelp: url_for('help.static', {'filename': 'resource_group_dialog.html'}),
      label: gettext('Resource Group'),
      hasSQL:  true,
      canDrop: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized) {
          return;
        }

        this.initialized = true;

        // Creating menu for the resource group node
        pgBrowser.add_menus([{
          name: 'create_resourcegroup_on_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Resource Group...'),
          data: {action: 'create',
            data_disabled: gettext('This option is only available on EPAS servers.')},
          /* Function is used to check the server type and version.
           * Resource Group only supported in PPAS 9.4 and above.
           */
          enable: function(node, item) {
            let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
              server = treeData['server'];
            return server.connected && node.server_type === 'ppas' &&
              node.version >= 90400;
          },
        },{
          name: 'create_resource_group_on_coll', node: 'coll-resource_group', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Resource Group...'),
          data: {action: 'create',
            data_disabled: gettext('This option is only available on EPAS servers.')},
        },{
          name: 'create_resource_group', node: 'resource_group', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Resource Group...'),
          data: {action: 'create',
            data_disabled: gettext('This option is only available on EPAS servers.')},
        },
        ]);
      },

      getSchema: ()=>{
        return new ResourceGroupSchema();
      },
    });
  }

  return pgBrowser.Nodes['coll-resource_group'];
});
