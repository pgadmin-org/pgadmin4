/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../../static/js/node_ajax';
import StatisticsSchema from './statistics.ui';

define('pgadmin.node.statistics', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, pgBrowser, schemaChild, schemaChildTreeNode
) {

  // Extend the browser's collection class for statistics collection
  if (!pgBrowser.Nodes['coll-statistics']) {
    pgBrowser.Nodes['coll-statistics'] =
      pgBrowser.Collection.extend({
        node: 'statistics',
        label: gettext('Statistics'),
        type: 'coll-statistics',
        columns: ['name', 'table', 'comment'],
        hasStatistics: true,
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Extend the browser's node class for statistics node
  if (!pgBrowser.Nodes['statistics']) {
    pgBrowser.Nodes['statistics'] = schemaChild.SchemaChildNode.extend({
      type: 'statistics',
      sqlAlterHelp: 'sql-alterstatistics.html',
      sqlCreateHelp: 'sql-createstatistics.html',
      dialogHelp: url_for('help.static', {'filename': 'statistics_dialog.html'}),
      label: gettext('Statistics'),
      collection_type: 'coll-statistics',
      hasSQL: true,
      hasDepends: true,
      hasStatistics: false,
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_statistics_on_coll',
          node: 'coll-statistics',
          module: this,
          applies: ['object', 'context'],
          callback: 'show_obj_properties',
          category: 'create',
          priority: 4,
          label: gettext('Statistics...'),
          data: {action: 'create', check: true},
          enable: 'canCreate',
          shortcut_preference: ['browser', 'sub_menu_create'],
        }, {
          name: 'create_statistics',
          node: 'statistics',
          module: this,
          applies: ['object', 'context'],
          callback: 'show_obj_properties',
          category: 'create',
          priority: 4,
          label: gettext('Statistics...'),
          data: {action: 'create', check: true},
          enable: 'canCreate',
          shortcut_preference: ['browser', 'sub_menu_create'],
        }, {
          name: 'create_statistics_on_schema',
          node: 'schema',
          module: this,
          applies: ['object', 'context'],
          callback: 'show_obj_properties',
          category: 'create',
          priority: 4,
          label: gettext('Statistics...'),
          data: {action: 'create', check: false},
          enable: 'canCreate',
        }]);

      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new StatisticsSchema(
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListByName('schema', treeNodeInfo, itemNodeData, {}, (m)=>{
              // Exclude pg_* schemas
              return !(m.label.match(/^pg_/));
            }),
            tables: ()=>getNodeListByName('table', treeNodeInfo, itemNodeData, {includeItemKeys: ['_id']}),
            getColumns: (params)=>{
              return getNodeAjaxOptions('get_columns', pgBrowser.Nodes['table'], treeNodeInfo, itemNodeData, {urlParams: params, useCache:false}, (rows)=>{
                return rows.map((r)=>({
                  'value': r.name,
                  'image': 'icon-column',
                  'label': r.name,
                }));
              });
            }
          },
          {
            schema: itemNodeData.label,
          }
        );
      },
    });
  }
  return pgBrowser.Nodes['statistics'];
});
