/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeColumnSchema } from './column.ui';

define('pgadmin.node.column', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform', 'pgadmin.backgrid',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, Backbone, pgAdmin, pgBrowser, Backform, Backgrid,
  SchemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-column']) {
    pgBrowser.Nodes['coll-column'] =
      pgBrowser.Collection.extend({
        node: 'column',
        label: gettext('Columns'),
        type: 'coll-column',
        columns: ['name', 'atttypid', 'description'],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: false,
      });
  }

  if (!pgBrowser.Nodes['column']) {
    pgBrowser.Nodes['column'] = pgBrowser.Node.extend({
      parent_type: ['table', 'view', 'mview'],
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
          icon: 'wcTabIcon icon-column', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_column', node: 'column', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Column...'),
          icon: 'wcTabIcon icon-column', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_column_onTable', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Column...'),
          icon: 'wcTabIcon icon-column', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_column_onView', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Column...'),
          icon: 'wcTabIcon icon-column', data: {action: 'create', check: true},
          enable: 'canCreate',
        },
        ]);
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return getNodeColumnSchema(treeNodeInfo, itemNodeData, pgBrowser);
      },
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'attnum',

        defaults: {
          name: undefined,
          attnum: undefined,
          description: undefined,
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', disabled: 'inSchemaWithColumnCheck',
          cellHeaderClasses:'width_percent_30',
          editable: 'editable_check_for_table',
        },{
          id: 'attnum', label: gettext('Position'), cell: 'string',
          type: 'text', disabled: 'notInSchema', mode: ['properties'],
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          disabled: 'notInSchema',
        }],
        // We will check if we are under schema node & in 'create' mode
        notInSchema: function() {
          if(this.node_info &&  'catalog' in this.node_info)
          {
            return true;
          }
          return false;
        },
      }),
      // Below function will enable right click menu for creating column
      canCreate: function(itemData, item, data) {
        // If check is false then , we will allow create menu
        if (data && data.check == false)
          return true;

        var t = pgBrowser.tree, i = item, d = itemData, parents = [];
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
