/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeListByName } from '../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../static/js/privilege.ui';
import DirectorySchema from './directory.ui';

define('pgadmin.node.directory', [
  'sources/gettext', 'sources/url_for',
  'pgadmin.browser', 'pgadmin.browser.collection',
], function(
  gettext, url_for, pgBrowser
) {

  if (!pgBrowser.Nodes['coll-directory']) {
    pgBrowser.Nodes['coll-directory'] =
      pgBrowser.Collection.extend({
        node: 'directory',
        label: gettext('Directories'),
        type: 'coll-directory',
        columns: ['name', 'diruser'],
        canDrop: true,
        canDropCascade: false,
      });
  }
  if (!pgBrowser.Nodes['directory']) {
    pgBrowser.Nodes['directory'] = pgBrowser.Node.extend({
      parent_type: 'server',
      type: 'directory',
      epasHelp: true,
      dialogHelp: url_for('help.static', {'filename': 'directory_dialog.html'}),
      label: gettext('Directory'),
      hasSQL:  true,
      canDrop: true,
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_directory_on_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Directory...'),
          data: {action: 'create',
            data_disabled: gettext('This option is only available on EPAS servers.')},
          /* Function is used to check the server type and version.
           * Directories only supported in EPAS 13 and above.
           */
          enable: function(node, item) {
            let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
              server = treeData['server'];
            return server.connected && node.server_type === 'ppas' &&
                node.version >= 130000;
          },
        },{
          name: 'create_directory_on_coll', node: 'coll-directory', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Directory...'),
          data: {action: 'create',
            data_disabled: gettext('This option is only available on EPAS servers.')},
        },{
          name: 'create_directory', node: 'directory', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Directory...'),
          data: {action: 'create',
            data_disabled: gettext('This option is only available on EPAS servers.')},
        },
        ]);
      },
      can_create_directory: function(node, item) {
        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
          server = treeData['server'];
        return server.connected && server.user.is_superuser;
      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new DirectorySchema(
          (privileges)=>getNodePrivilegeRoleSchema(this, treeNodeInfo, itemNodeData, privileges),
          treeNodeInfo,
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
          },
          {
            diruser: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
          },
        );
      },
    });
  }

  return pgBrowser.Nodes['coll-directory'];
});
