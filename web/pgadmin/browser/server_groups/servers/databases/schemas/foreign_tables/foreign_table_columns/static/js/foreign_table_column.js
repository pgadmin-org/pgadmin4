/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { getNodeColumnSchema } from '../../../static/js/foreign_table.ui';

define('pgadmin.node.foreign_table_column', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'pgadmin.browser.collection',
], function(
  gettext, url_for, pgBrowser
) {

  if (!pgBrowser.Nodes['coll-foreign_table_column']) {
    pgBrowser.Nodes['coll-foreign_table_column'] =
      pgBrowser.Collection.extend({
        node: 'foreign_table_column',
        label: gettext('Columns'),
        type: 'coll-foreign_table_column',
        columns: ['name', 'cltype', 'description']
      });
  }

  if (!pgBrowser.Nodes['foreign_table_column']) {
    pgBrowser.Nodes['foreign_table_column'] = pgBrowser.Node.extend({
      // Foreign table is added in parent_type to support triggers on
      // foreign table where we need column information.
      parent_type: ['foreign_table'],
      collection_type: ['coll-foreign_table'],
      type: 'foreign_table_column',
      label: gettext('Column'),
      hasSQL:  true,
      sqlAlterHelp: 'sql-altertable.html',
      sqlCreateHelp: 'sql-altertable.html',
      dialogHelp: url_for('help.static', {'filename': 'column_dialog.html'}),
      canDrop: true,
      canDropCascade: false,
      hasDepends: true,
      hasStatistics: true,
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;
        pgBrowser.add_menus([{
          name: 'create_column_on_coll', node: 'coll-foreign_table_column', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Column...'),
          data: {action: 'create'}, enable: 'canCreate',
        },{
          name: 'create_column_onTable', node: 'foreign_table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Column...'),
          data: {action: 'create'}, enable: 'canCreate',
        },
        ]);
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return getNodeColumnSchema(treeNodeInfo, itemNodeData, pgBrowser);
      },
    });
  }

  return pgBrowser.Nodes['foreign_table_column'];
});
