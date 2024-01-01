/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeListByName } from '../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../static/js/privilege.ui';
import { getNodeVariableSchema } from '../../../static/js/variable.ui';
import TablespaceSchema from './tablespace.ui';

define('pgadmin.node.tablespace', [
  'sources/gettext', 'sources/url_for',
  'pgadmin.browser', 'pgadmin.browser.collection',
], function(
  gettext, url_for, pgBrowser
) {

  if (!pgBrowser.Nodes['coll-tablespace']) {
    pgBrowser.Nodes['coll-tablespace'] =
      pgBrowser.Collection.extend({
        node: 'tablespace',
        label: gettext('Tablespaces'),
        type: 'coll-tablespace',
        columns: ['name', 'spcuser', 'description'],
        hasStatistics: true,
        statsPrettifyFields: [gettext('Size')],
        canDrop: true,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['tablespace']) {
    pgBrowser.Nodes['tablespace'] = pgBrowser.Node.extend({
      parent_type: 'server',
      type: 'tablespace',
      sqlAlterHelp: 'sql-altertablespace.html',
      sqlCreateHelp: 'sql-createtablespace.html',
      dialogHelp: url_for('help.static', {'filename': 'tablespace_dialog.html'}),
      label: gettext('Tablespace'),
      hasSQL:  true,
      canDrop: true,
      hasDepends: true,
      hasStatistics: true,
      statsPrettifyFields: [gettext('Size')],
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_tablespace_on_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Tablespace...'),
          data: {action: 'create'},
          enable: 'can_create_tablespace',
        },{
          name: 'create_tablespace_on_coll', node: 'coll-tablespace', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Tablespace...'),
          data: {action: 'create'},
          enable: 'can_create_tablespace',
        },{
          name: 'create_tablespace', node: 'tablespace', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Tablespace...'),
          data: {action: 'create'},
          enable: 'can_create_tablespace',
        },
        ]);
      },
      can_create_tablespace: function(node, item) {
        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
          server = treeData['server'];

        return server.connected && server.user.is_superuser;
      },
      callbacks: {
      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new TablespaceSchema(
          ()=>getNodeVariableSchema(this, treeNodeInfo, itemNodeData, false, false),
          (privileges)=>getNodePrivilegeRoleSchema(this, treeNodeInfo, itemNodeData, privileges),
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
          },
          {
            spcuser: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
          }
        );
      },
    });

  }

  return pgBrowser.Nodes['coll-tablespace'];
});
