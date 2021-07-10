/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../../static/js/privilege.ui';
import ForeignDataWrapperSchema from './foreign_data_wrapper.ui';

define('pgadmin.node.foreign_data_wrapper', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.browser.collection', 'pgadmin.browser.server.privilege',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, Backform) {

  // Extend the browser's collection class for foreign data wrapper collection
  if (!pgBrowser.Nodes['coll-foreign_data_wrapper']) {
    pgBrowser.Nodes['coll-foreign_data_wrapper'] =
      pgBrowser.Collection.extend({
        node: 'foreign_data_wrapper',
        label: gettext('Foreign Data Wrappers'),
        type: 'coll-foreign_data_wrapper',
        columns: ['name','fdwowner','description'],
      });
  }

  // Extend the browser's node class for foreign data wrapper node
  if (!pgBrowser.Nodes['foreign_data_wrapper']) {
    pgBrowser.Nodes['foreign_data_wrapper'] = pgBrowser.Node.extend({
      parent_type: 'database',
      type: 'foreign_data_wrapper',
      sqlAlterHelp: 'sql-alterforeigndatawrapper.html',
      sqlCreateHelp: 'sql-createforeigndatawrapper.html',
      dialogHelp: url_for('help.static', {'filename': 'foreign_data_wrapper_dialog.html'}),
      label: gettext('Foreign Data Wrapper'),
      hasSQL:  true,
      hasDepends: true,
      canDrop: true,
      canDropCascade: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        /* Create foreign data wrapper context menu at database,
         * foreign data wrapper collections and foreign data wrapper node
         */
        pgBrowser.add_menus([{
          name: 'create_foreign_data_wrapper_on_coll', node: 'coll-foreign_data_wrapper', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Data Wrapper...'),
          icon: 'wcTabIcon icon-foreign_data_wrapper', data: {action: 'create'},
        },{
          name: 'create_foreign_data_wrapper', node: 'foreign_data_wrapper', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Data Wrapper...'),
          icon: 'wcTabIcon icon-foreign_data_wrapper', data: {action: 'create'},
        },{
          name: 'create_foreign_data_wrapper', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Data Wrapper...'),
          icon: 'wcTabIcon icon-foreign_data_wrapper', data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].is_conn_allow,
        },
        ]);
      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new ForeignDataWrapperSchema(
          (privileges)=>getNodePrivilegeRoleSchema(this, treeNodeInfo, itemNodeData, privileges),
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            fdwhan:
              ()=>getNodeAjaxOptions('get_handlers', this, treeNodeInfo, itemNodeData),
            fdwvalue:
              ()=>getNodeAjaxOptions('get_validators', this, treeNodeInfo, itemNodeData),
          },
          {
            fdwowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
          }
        );
      },

      // Defining model for foreign data wrapper node
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'fdwowner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Defining schema for the foreign data wrapper node
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', readonly: function() {
            // name field will be disabled only if edit mode
            return (
              this.mode == 'edit'
            );
          },
        }, {
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text', mode: ['properties'],
        }, {
          id: 'fdwowner', label: gettext('Owner'), type: 'text',
          control: Backform.NodeListByNameControl, node: 'role',
          mode: ['edit', 'create', 'properties'], select2: { allowClear: false },
        }, {
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline',
        }],
      }),
    });
  }

  return pgBrowser.Nodes['foreign_data_wrapper'];
});
