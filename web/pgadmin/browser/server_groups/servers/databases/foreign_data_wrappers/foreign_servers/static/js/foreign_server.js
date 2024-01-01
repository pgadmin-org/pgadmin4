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
import ForeignServerSchema from './foreign_server.ui';

define('pgadmin.node.foreign_server', [
  'sources/gettext', 'sources/url_for', 'sources/pgadmin',
  'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser) {

  // Extend the browser's collection class for foreign server collection
  if (!pgBrowser.Nodes['coll-foreign_server']) {
    pgAdmin.Browser.Nodes['coll-foreign_server'] =
      pgAdmin.Browser.Collection.extend({
        node: 'foreign_server',
        label: gettext('Foreign Servers'),
        type: 'coll-foreign_server',
        columns: ['name','fsrvowner','description'],
      });
  }

  // Extend the browser's node class for foreign server node
  if (!pgBrowser.Nodes['foreign_server']) {
    pgAdmin.Browser.Nodes['foreign_server'] = pgAdmin.Browser.Node.extend({
      parent_type: 'foreign_data_wrapper',
      type: 'foreign_server',
      sqlAlterHelp: 'sql-alterserver.html',
      sqlCreateHelp: 'sql-createserver.html',
      dialogHelp: url_for('help.static', {'filename': 'foreign_server_dialog.html'}),
      label: gettext('Foreign Server'),
      hasSQL:  true,
      hasDepends: true,
      canDrop: true,
      canDropCascade: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        /* Create foreign server context menu at database,
         * foreign server collections and foreign server node
         */
        pgBrowser.add_menus([{
          name: 'create_foreign_server_on_coll', node: 'coll-foreign_server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Server...'),
          data: {action: 'create'},
        },{
          name: 'create_foreign_server', node: 'foreign_server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Server...'),
          data: {action: 'create'},
        },{
          name: 'create_foreign_server', node: 'foreign_data_wrapper', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Server...'),
          data: {action: 'create'},
        },
        ]);
      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new ForeignServerSchema(
          (privileges)=>getNodePrivilegeRoleSchema(this, treeNodeInfo, itemNodeData, privileges),
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
          },
          {
            fsrvowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
          }
        );
      },
    });

  }

  return pgBrowser.Nodes['coll-foreign_server'];
});
