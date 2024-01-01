/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../static/js/node_ajax';
import LanguageSchema from './language.ui';
import { getNodePrivilegeRoleSchema } from '../../../../static/js/privilege.ui';

define('pgadmin.node.language', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgBrowser) {

  // Extend the browser's collection class for languages collection
  if (!pgBrowser.Nodes['coll-language']) {
    pgBrowser.Nodes['coll-language'] =
      pgBrowser.Collection.extend({
        node: 'language',
        label: gettext('Languages'),
        type: 'coll-language',
        columns: ['name', 'lanowner', 'description'],
      });
  }

  // Extend the browser's node class for language node
  if (!pgBrowser.Nodes['language']) {
    pgBrowser.Nodes['language'] = pgBrowser.Node.extend({
      parent_type: 'database',
      type: 'language',
      sqlAlterHelp: 'sql-alterlanguage.html',
      sqlCreateHelp: 'sql-createlanguage.html',
      dialogHelp: url_for('help.static', {'filename': 'language_dialog.html'}),
      label: gettext('Language'),
      hasSQL:  true,
      canDrop: true,
      canDropCascade: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;


        // Add context menus for language
        pgBrowser.add_menus([{
          name: 'create_language_on_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Language...'),
          data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].is_conn_allow,
        },{
          name: 'create_language_on_coll', node: 'coll-language', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Language...'),
          data: {action: 'create'},
        },{
          name: 'create_language', node: 'language', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Language...'),
          data: {action: 'create'},
        }]);
      },


      getSchema: function(treeNodeInfo, itemNodeData){
        return new LanguageSchema(
          (privileges)=>getNodePrivilegeRoleSchema(this, treeNodeInfo, itemNodeData, privileges),
          {
            lan_functions: ()=>getNodeAjaxOptions('get_functions', this, treeNodeInfo, itemNodeData),
            templates_data: ()=>getNodeAjaxOptions('get_templates', this, treeNodeInfo, itemNodeData),
            role:()=>getNodeListByName('role', treeNodeInfo, itemNodeData),

          },
          {
            node_info: treeNodeInfo.server,
          },
        );
      },
    });
  }
  return pgBrowser.Nodes['coll-language'];
});
