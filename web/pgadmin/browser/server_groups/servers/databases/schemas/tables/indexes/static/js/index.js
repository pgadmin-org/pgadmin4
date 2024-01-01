/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import IndexSchema from './index.ui';
import { getNodeAjaxOptions, getNodeListByName } from 'pgbrowser/node_ajax';
import _ from 'lodash';

define('pgadmin.node.index', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, pgAdmin, pgBrowser, SchemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-index']) {
    pgAdmin.Browser.Nodes['coll-index'] =
      pgAdmin.Browser.Collection.extend({
        node: 'index',
        label: gettext('Indexes'),
        type: 'coll-index',
        columns: ['name', 'description'],
        hasStatistics: true,
        statsPrettifyFields: [gettext('Size'), gettext('Index size')],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['index']) {
    pgAdmin.Browser.Nodes['index'] = pgBrowser.Node.extend({
      parent_type: ['table', 'view', 'mview', 'partition'],
      collection_type: ['coll-table', 'coll-view'],
      sqlAlterHelp: 'sql-alterindex.html',
      sqlCreateHelp: 'sql-createindex.html',
      dialogHelp: url_for('help.static', {'filename': 'index_dialog.html'}),
      type: 'index',
      label: gettext('Index'),
      hasSQL:  true,
      hasDepends: true,
      hasStatistics: true,
      width: pgBrowser.stdW.lg + 'px',
      statsPrettifyFields: [gettext('Size'), gettext('Index size')],
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_index_on_coll', node: 'coll-index', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Index...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_index', node: 'index', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Index...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_index_onTable', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Index...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_index_onPartition', node: 'partition', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Index...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_index_onMatView', node: 'mview', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 5, label: gettext('Index...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },
        ]);
      },
      canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      // Below function will enable right click menu for creating column
      canCreate: function(itemData, item, data) {
        // If check is false then , we will allow create menu
        if (data && !data.check)
          return true;

        let t = pgBrowser.tree, i = item, d = itemData, parents = [],
          immediate_parent_table_found = false,
          is_immediate_parent_table_partitioned = false,
          s_version = t.getTreeNodeHierarchy(i).server.version;
        // To iterate over tree to check parent node
        while (i) {
          // Do not allow creating index on partitioned tables.
          if (!immediate_parent_table_found &&
            _.indexOf(['table', 'partition'], d._type) > -1) {
            immediate_parent_table_found = true;
            if ('is_partitioned' in d && d.is_partitioned && s_version < 110000) {
              is_immediate_parent_table_partitioned = true;
            }
          }

          // If it is schema then allow user to create index
          if (_.indexOf(['schema'], d._type) > -1)
            return !is_immediate_parent_table_partitioned;
          parents.push(d._type);
          i = t.hasParent(i) ? t.parent(i) : null;
          d = i ? t.itemData(i) : null;
        }
        // If node is under catalog then do not allow 'create' menu
        if (_.indexOf(parents, 'catalog') > -1) {
          return false;
        } else {
          return !is_immediate_parent_table_partitioned;
        }
      },
      getSchema: (treeNodeInfo, itemNodeData) => {
        let nodeObj = pgAdmin.Browser.Nodes['index'];
        return new IndexSchema(
          {
            tablespaceList: ()=>getNodeListByName('tablespace', treeNodeInfo, itemNodeData, {}, (m)=>{
              return (m.label != 'pg_global');
            }),
            amnameList : ()=>getNodeAjaxOptions('get_access_methods', nodeObj, treeNodeInfo, itemNodeData, {jumpAfterNode: 'schema'}),
            columnList: ()=>getNodeListByName('column', treeNodeInfo, itemNodeData, {}),
            collationList: ()=>getNodeAjaxOptions('get_collations', nodeObj, treeNodeInfo, itemNodeData, {jumpAfterNode: 'schema'}),
            opClassList: ()=>getNodeAjaxOptions('get_op_class', nodeObj, treeNodeInfo, itemNodeData, {jumpAfterNode: 'schema'})
          },
          {
            node_info: treeNodeInfo
          },
          {
            amname: 'btree',
            deduplicate_items: treeNodeInfo.server.version >= 130000 ? true : undefined,
          }
        );
      }
    });
  }

  return pgBrowser.Nodes['index'];
});
