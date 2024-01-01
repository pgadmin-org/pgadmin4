/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../../static/js/privilege.ui';
import ForeignDataWrapperSchema from './foreign_data_wrapper.ui';

define('pgadmin.node.foreign_data_wrapper', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgBrowser) {

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
          data: {action: 'create'},
        },{
          name: 'create_foreign_data_wrapper', node: 'foreign_data_wrapper', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Data Wrapper...'),
          data: {action: 'create'},
        },{
          name: 'create_foreign_data_wrapper', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Data Wrapper...'),
          data: {action: 'create'},
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
    });
  }

  return pgBrowser.Nodes['foreign_data_wrapper'];
});
