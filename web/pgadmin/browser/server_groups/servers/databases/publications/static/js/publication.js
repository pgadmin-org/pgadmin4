/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../static/js/node_ajax';
import PublicationSchema from './publication.ui';

define('pgadmin.node.publication', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.browser.collection', 'pgadmin.browser.server.privilege',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, Backform) {

  // Extend the browser's collection class for publications collection
  if (!pgBrowser.Nodes['coll-publication']) {
    pgBrowser.Nodes['coll-publication'] =
      pgBrowser.Collection.extend({
        node: 'publication',
        label: gettext('Publications'),
        type: 'coll-publication',
        columns: ['name', 'pubowner', 'pubtable', 'all_table'],

      });
  }

  // Extend the browser's node class for publication node
  if (!pgBrowser.Nodes['publication']) {
    pgBrowser.Nodes['publication'] = pgBrowser.Node.extend({
      parent_type: 'database',
      type: 'publication',
      sqlAlterHelp: 'sql-alterpublication.html',
      sqlCreateHelp: 'sql-createpublication.html',
      dialogHelp: url_for('help.static', {'filename': 'publication_dialog.html'}),
      label: gettext('Publication'),
      hasSQL:  true,
      canDrop: true,
      canDropCascade: true,
      hasDepends: true,

      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;


        // Add context menus for publication
        pgBrowser.add_menus([{
          name: 'create_publication_on_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Publication...'),
          icon: 'wcTabIcon icon-publication', data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].canCreate,
        },{
          name: 'create_publication_on_coll', node: 'coll-publication', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Publication...'),
          icon: 'wcTabIcon icon-publication', data: {action: 'create'},
        },{
          name: 'create_publication', node: 'publication', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Publication...'),
          icon: 'wcTabIcon icon-publication', data: {action: 'create'},
        }]);
      },
      // Define the model for publication node
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'pubowner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Define the schema for the publication node
        schema: [{
          id: 'name', label: gettext('Name'), type: 'text',
          mode: ['properties', 'create', 'edit'],
          visible: function() {
            if(!_.isUndefined(this.node_info) && !_.isUndefined(this.node_info.server)
              && !_.isUndefined(this.node_info.server.version) &&
                this.node_info.server.version >= 100000) {
              return true;
            }
            return false;
          },
        },{
          id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
          type: 'text',
        },{
          id: 'pubowner', label: gettext('Owner'), type: 'text',
          control: Backform.NodeListByNameControl, node: 'role',
          disabled: function(m){
            if(m.isNew())
              return true;
            return false;
          },
          mode: ['edit', 'properties', 'create'], select2: { allowClear: false},
        },{
          id: 'all_table', label: gettext('All tables?'), type: 'switch',
          group: gettext('Definition'), mode: ['edit', 'properties', 'create'], deps: ['name'],
          readonly: function(m) {return !m.isNew();},
        },
        {
          id: 'pubtable', label: gettext('Tables'), type: 'text', group: gettext('Definition'),
          mode: ['properties'],
        },
        ],


        /* validate function is used to validate the input given by
         * the user. In case of error, message will be displayed on
         * the GUI for the respective control.
         */

        sessChanged: function() {
          if (this.sessAttrs['pubtable'] == '' && this.origSessAttrs['pubtable'] == '')
            return false;
          return pgBrowser.DataModel.prototype.sessChanged.apply(this);
        },

        canCreate: function(itemData, item) {

          var treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
            server = treeData['server'];

          // If server is less than 10 then do not allow 'create' menu
          if (server && server.version < 100000)
            return false;

          // by default we want to allow create menu
          return true;
        },

      }),

      getSchema: function(treeNodeInfo, itemNodeData){
        let schema = new PublicationSchema(
          {
            publicationTable: ()=>getNodeAjaxOptions('get_tables', this, treeNodeInfo, itemNodeData),
            role:()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
          },{
            node_info: treeNodeInfo.server,
          },
        );
        return schema;
      },

    });
  }
  return pgBrowser.Nodes['coll-publication'];
});
