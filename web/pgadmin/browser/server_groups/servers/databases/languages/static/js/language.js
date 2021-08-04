/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../static/js/node_ajax';
import LanguageSchema from './language.ui';
import { getNodePrivilegeRoleSchema } from '../../../../static/js/privilege.ui';
import _ from 'lodash';

define('pgadmin.node.language', [
  'sources/gettext', 'sources/url_for', 'jquery',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.browser.collection', 'pgadmin.browser.server.privilege',
], function(gettext, url_for, $, pgAdmin, pgBrowser, Backform) {

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
          icon: 'wcTabIcon icon-language', data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].is_conn_allow,
        },{
          name: 'create_language_on_coll', node: 'coll-language', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Language...'),
          icon: 'wcTabIcon icon-language', data: {action: 'create'},
        },{
          name: 'create_language', node: 'language', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Language...'),
          icon: 'wcTabIcon icon-language', data: {action: 'create'},
        }]);
      },

      // Define the model for language node
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'lanowner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Define the schema for the language node
        schema: [{
          id: 'name', label: gettext('Name'), type: 'text',
          mode: ['properties'],
        },{
          id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
          type: 'text',
        },{
          id: 'lanowner', label: gettext('Owner'), type: 'text',
          control: Backform.NodeListByNameControl, node: 'role',
          mode: ['edit', 'properties', 'create'], select2: { allowClear: false },
        },
        {
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline',
        },
        ],
      }),

      getSchema: function(treeNodeInfo, itemNodeData){
        let schema = new LanguageSchema(
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
        return schema;
      },
    });
  }
  return pgBrowser.Nodes['coll-language'];
});
