/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../static/js/node_ajax';
import ExtensionsSchema from './extension.ui';
import _ from 'lodash';

define('pgadmin.node.extension', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser) {

  /*
   * Create and Add an Extension Collection into nodes
   * Params:
   *   label - Label for Node
   *   type - Type of Node
   *   columns - List of columns to show under under properties.
   */
  if (!pgBrowser.Nodes['coll-extension']) {
    pgAdmin.Browser.Nodes['coll-extension'] =
      pgAdmin.Browser.Collection.extend({
        node: 'extension',
        label: gettext('Extensions'),
        type: 'coll-extension',
        columns: ['name', 'owner', 'comment'],
      });
  }

  /*
   * Create and Add an Extension Node into nodes
   * Params:
   *   parent_type - Name of parent Node
   *   type - Type of Node
   *   hasSQL - True if we need to show SQL query Tab control, otherwise False
   *   canDrop - True to show "Drop Extension" link under Context menu,
   *    otherwise False
   *   canDropCascade - True to show "Drop Cascade" link under Context menu,
   *    otherwise False
   *   columns - List of columns to show under under properties tab.
   *   label - Label for Node
   */
  if (!pgBrowser.Nodes['extension']) {
    pgAdmin.Browser.Nodes['extension'] =
    pgAdmin.Browser.Node.extend({
      parent_type: 'database',
      type: 'extension',
      sqlAlterHelp: 'sql-alterextension.html',
      sqlCreateHelp: 'sql-createextension.html',
      dialogHelp: url_for('help.static', {'filename': 'extension_dialog.html'}),
      hasSQL: true,
      hasDepends: true,
      canDrop: true,
      canDropCascade: true,
      label: gettext('Extension'),

      Init: function() {
        if(this.initialized)
          return;

        this.initialized = true;

        /*
         * Add "create extension" menu item into context and object menu
         * for the following nodes:
         * coll-extension, extension and database.
         */
        pgBrowser.add_menus([{
          name: 'create_extension_on_coll', node: 'coll-extension', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Extension...'),
          data: {action: 'create'},
        },{
          name: 'create_extension', node: 'extension', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Extension...'),
          data: {action: 'create'},
        },{
          name: 'create_extension', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Extension...'),
          data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].is_conn_allow,
        },
        ]);
      },

      getSchema: (treeNodeInfo, itemNodeData)=>{
        let nodeObj = pgAdmin.Browser.Nodes['extension'];
        return new ExtensionsSchema(
          {
            role:()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            extensionsList:()=>getNodeAjaxOptions('avails', nodeObj, treeNodeInfo, itemNodeData, { cacheLevel: 'server'},
              (data)=>{
                let res = [];
                if (data && _.isArray(data)) {
                  _.each(data, function(d) {
                    res.push({label: d.name, value: d.name, data:d});
                  });
                }
                return res;
              }),
            schemaList:()=>getNodeListByName('schema', treeNodeInfo, itemNodeData)
          }
        );
      }
    });
  }

  return pgBrowser.Nodes['coll-extension'];
});
