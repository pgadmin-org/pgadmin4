/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions,getNodeListByName } from '../../../../../../static/js/node_ajax';
import PublicationSchema from './publication.ui';

define('pgadmin.node.publication', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgBrowser) {

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
      width: pgBrowser.stdW.md + 'px',

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
          data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].canCreate,
        },{
          name: 'create_publication_on_coll', node: 'coll-publication', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Publication...'),
          data: {action: 'create'},
        },{
          name: 'create_publication', node: 'publication', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Publication...'),
          data: {action: 'create'},
        }]);
      },
      
      getSchema: function(treeNodeInfo, itemNodeData){
        return new PublicationSchema(
          {
            allTables: ()=>getNodeAjaxOptions('get_tables', this, treeNodeInfo, itemNodeData),
            allSchemas:()=>getNodeAjaxOptions('get_schemas', this, treeNodeInfo, itemNodeData),
            getColumns: (params)=>getNodeAjaxOptions('get_all_columns', this, treeNodeInfo, itemNodeData,{urlParams: params, useCache:false}),
            role:()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
          },{
            node_info: treeNodeInfo.server,
          },
        );
      },

    });
  }
  return pgBrowser.Nodes['coll-publication'];
});
