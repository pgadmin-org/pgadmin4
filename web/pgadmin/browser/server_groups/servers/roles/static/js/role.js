/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import RoleSchema from './role.ui';
import { getNodeVariableSchema } from '../../../static/js/variable.ui';
import { getNodeListByName } from '../../../../../static/js/node_ajax';
import { getMembershipSchema } from '../../../static/js/membership.ui';
import { showRoleReassign } from './roleReassign';

define('pgadmin.node.role', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser'
], function(gettext, url_for, pgAdmin, pgBrowser) {

  if (!pgBrowser.Nodes['coll-role']) {
    pgAdmin.Browser.Nodes['coll-role'] =
      pgAdmin.Browser.Collection.extend({
        node: 'role',
        label: gettext('Login/Group Roles'),
        type: 'coll-role',
        columns: [
          'rolname', 'rolvaliduntil', 'rolconnlimit', 'rolcanlogin',
          'rolsuper', 'rolcreaterole', 'rolcreatedb', 'rolcatupdate',
          'rolinherit', 'rolreplication',
        ],
        canDrop: true,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['role']) {
    pgAdmin.Browser.Nodes['role'] = pgAdmin.Browser.Node.extend({
      parent_type: 'server',
      type: 'role',
      sqlAlterHelp: 'sql-alterrole.html',
      sqlCreateHelp: 'sql-createrole.html',
      dialogHelp: url_for('help.static', {'filename': 'role_dialog.html'}),
      label: gettext('Login/Group Role'),
      hasSQL: true,
      width: '550px',
      canDrop: function(node, item) {
        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
          server = treeData['server'];
          /*
        To Drop a role:
          1) If Role we are deleting is superuser then User must be superuser
          2) And for non-superuser roles User must have Create Role permission
          */

        // Role you are trying to drop is Superuser ?
        if(node.is_superuser) {
          return server.connected && server.user.is_superuser;
        }
        // For non super users
        return server.connected && server.user.can_create_role;
      },
      hasDepends: true,
      node_label: function(r) {
        return r.label;
      },
      node_image: function(r) {
        if (!r)
          return 'icon-role';
        return (r.can_login ? 'icon-role' : 'icon-group');
      },
      title: function(d) {
        if (!d) {
          return this.label;
        }
        if (d.can_login) {
          return gettext('Login Role') + ' - ' + d.label;
        }
        return gettext('Group Role') + ' - ' + d.label;
      },
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_role_on_server', node: 'server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Login/Group Role...'),
          data: {action: 'create'},
          enable: 'can_create_role',
        },{
          name: 'create_role_on_roles', node: 'coll-role', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Login/Group Role...'),
          data: {action: 'create'},
          enable: 'can_create_role',
        },{
          name: 'create_role', node: 'role', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Login/Group Role...'),
          data: {action: 'create'},
          enable: 'can_create_role',
        }, {
          name: 'reassign_role', node: 'role', module: this,
          applies: ['object', 'context'], callback: 'reassign_role',
          category: 'role', priority: 5,
          label: gettext('Reassign/Drop Owned...'),
          enable: 'can_reassign_role',
        }]);
      },
      can_create_role: function(node, item) {
        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
          server = treeData['server'];

        return server.connected && server.user.can_create_role;
      },
      can_reassign_role: function(node, item) {
        let treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
          server = treeData['server'];

        return server.connected && node.can_login;
      },
      reassign_role: function() {
        showRoleReassign();
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new RoleSchema(
          ()=>getNodeVariableSchema(this, treeNodeInfo, itemNodeData, true, false),
          ()=>getMembershipSchema(this, treeNodeInfo, itemNodeData),
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            nodeInfo: treeNodeInfo
          },
        );
      },
    });
  }

  return pgBrowser.Nodes['role'];
});
