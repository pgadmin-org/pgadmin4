/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeColumnSchema } from './column.ui';
import _ from 'lodash';

define('pgadmin.node.column', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'pgadmin.browser.collection',
], function(
  gettext, url_for, pgBrowser, SchemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-column']) {
    pgBrowser.Nodes['coll-column'] =
      pgBrowser.Collection.extend({
        node: 'column',
        label: gettext('Columns'),
        type: 'coll-column',
        columns: ['name', 'cltype', 'is_pk','attnotnull', 'description'],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['column']) {
    pgBrowser.Nodes['column'] = pgBrowser.Node.extend({
      // Foreign table is added in parent_type to support triggers on
      // foreign table where we need column information.
      parent_type: ['table', 'view', 'mview', 'foreign_table'],
      collection_type: ['coll-table', 'coll-view', 'coll-mview'],
      type: 'column',
      label: gettext('Column'),
      hasSQL:  true,
      sqlAlterHelp: 'sql-altertable.html',
      sqlCreateHelp: 'sql-altertable.html',
      dialogHelp: url_for('help.static', {'filename': 'column_dialog.html'}),
      canDrop: function(itemData, item){
        let node = pgBrowser.tree.findNodeByDomElement(item);

        if (!node)
          return false;

        // Only a column of a table can be droped, and only when it is not of
        // catalog.
        return node.anyParent(
          (parentNode) => (
            parentNode.getData()._type === 'table' &&
              !parentNode.anyParent(
                (grandParentNode) => (
                  grandParentNode.getData()._type === 'catalog'
                )
              )
          )
        );
      },
      hasDepends: true,
      hasStatistics: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_column_on_coll', node: 'coll-column', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Column...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_column', node: 'column', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Column...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_column_onTable', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Column...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_column_onView', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Column...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },
        ]);
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return getNodeColumnSchema(treeNodeInfo, itemNodeData, pgBrowser);
      },
      // Below function will enable right click menu for creating column
      canCreate: function(itemData, item, data) {
        // If check is false then , we will allow create menu
        if (data && !data.check)
          return true;

        let t = pgBrowser.tree, i = item, d = itemData, parents = [];
        // To iterate over tree to check parent node
        while (i) {
          // If it is schema then allow user to create table
          if (_.indexOf(['schema'], d._type) > -1) {
            return true;
          }
          else if (_.indexOf(['view', 'coll-view',
            'mview',
            'coll-mview'], d._type) > -1) {
            parents.push(d._type);
            break;
          }
          parents.push(d._type);
          i = t.hasParent(i) ? t.parent(i) : null;
          d = i ? t.itemData(i) : null;
        }
        // If node is under catalog then do not allow 'create' menu
        return !(_.indexOf(parents, 'catalog') > -1 ||
          _.indexOf(parents, 'coll-view') > -1 ||
          _.indexOf(parents, 'coll-mview') > -1 ||
          _.indexOf(parents, 'mview') > -1 ||
          _.indexOf(parents, 'view') > -1);
      },
    });
  }

  return pgBrowser.Nodes['column'];
});
