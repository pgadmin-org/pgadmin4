/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeListByName } from '../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../static/js/privilege.ui';
import { getNodeVariableSchema } from '../../../static/js/variable.ui';
import TablespaceSchema from './tablespace.ui';
import _ from 'lodash';

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
          icon: 'wcTabIcon icon-tablespace', data: {action: 'create'},
          enable: 'can_create_tablespace',
        },{
          name: 'create_tablespace_on_coll', node: 'coll-tablespace', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Tablespace...'),
          icon: 'wcTabIcon icon-tablespace', data: {action: 'create'},
          enable: 'can_create_tablespace',
        },{
          name: 'create_tablespace', node: 'tablespace', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Tablespace...'),
          icon: 'wcTabIcon icon-tablespace', data: {action: 'create'},
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

      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',

        // Default values!
        initialize: function(attrs, args) {
          let isNew = (_.size(attrs) === 0);

          if (isNew) {
            let userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({'spcuser': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        schema: [
          {
            id: 'name', label: gettext('Name'), cell: 'string',
            type: 'text',
          }, {
            id: 'spcuser', label: gettext('Owner'), cell: 'string',
            type: 'text', control: 'node-list-by-name', node: 'role',
            select2: {allowClear: false},
          }, {
            id: 'description', label: gettext('Comment'), cell: 'string',
            type: 'multiline',
          },
        ],
      }),
    });

  }

  return pgBrowser.Nodes['coll-tablespace'];
});
