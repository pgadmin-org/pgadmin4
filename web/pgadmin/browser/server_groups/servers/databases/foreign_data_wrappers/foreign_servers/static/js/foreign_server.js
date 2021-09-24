/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeListByName } from '../../../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import ForeignServerSchema from './foreign_server.ui';

define('pgadmin.node.foreign_server', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'sources/pgadmin',
  'pgadmin.browser', 'pgadmin.backform', 'pgadmin.browser.collection',
  'pgadmin.browser.server.privilege',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, Backform) {

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
          icon: 'wcTabIcon icon-foreign_server', data: {action: 'create'},
        },{
          name: 'create_foreign_server', node: 'foreign_server', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Server...'),
          icon: 'wcTabIcon icon-foreign_server', data: {action: 'create'},
        },{
          name: 'create_foreign_server', node: 'foreign_data_wrapper', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Server...'),
          icon: 'wcTabIcon icon-foreign_server', data: {action: 'create'},
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

      // Defining model for foreign server node
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'fsrvowner': userInfo.name}, {silent: true});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Defining schema for the foreign server node
        schema: [
          {
            id: 'name', label: gettext('Name'), cell: 'string',
            type: 'text', disabled: function() {
              return (
                this.mode == 'edit' && this.node_info.server.version < 90200
              );
            },
          }, {
            id: 'oid', label: gettext('OID'), cell: 'string',
            type: 'text', mode: ['properties'],
          }, {
            id: 'fsrvowner', label: gettext('Owner'), type: 'text',
            control: Backform.NodeListByNameControl, node: 'role',
            mode: ['edit', 'create', 'properties'], select2: { allowClear: false },
          }, {
            id: 'description', label: gettext('Comment'), cell: 'string',
            type: 'multiline',
          },
        ],
      }),
    });

  }

  return pgBrowser.Nodes['coll-foreign_server'];
});
