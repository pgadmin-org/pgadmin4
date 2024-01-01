/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeListByName } from '../../../../../../../../../static/js/node_ajax';
import UniqueConstraintSchema from './unique_constraint.ui';
import _ from 'lodash';

define('pgadmin.node.unique_constraint', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser) {

  // Extend the browser's node class for index constraint node
  if (!pgBrowser.Nodes['unique_constraint']) {
    pgAdmin.Browser.Nodes['unique_constraint'] = pgBrowser.Node.extend({
      type: 'unique_constraint',
      label: gettext('Unique constraint'),
      collection_type: 'coll-constraints',
      sqlAlterHelp: 'ddl-alter.html',
      sqlCreateHelp: 'ddl-constraints.html',
      dialogHelp: url_for('help.static', {filename: 'unique_constraint_dialog.html'}),
      hasSQL: true,
      hasDepends: true,
      hasStatistics: true,
      statsPrettifyFields: [gettext('Index size')],
      parent_type: ['table','partition'],
      canDrop: true,
      canDropCascade: true,
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_unique_constraint_on_coll', node: 'coll-constraints', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Unique constraint'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },
        ]);
      },
      canCreate: function(itemData, item, data) {
        // If check is false then , we will allow create menu
        if (data && !data.check)
          return true;

        let t = pgBrowser.tree, i = item, d = itemData, parents = [],
          immediate_parent_table_found = false,
          is_immediate_parent_table_partitioned = false,
          s_version = pgBrowser.tree.getTreeNodeHierarchy(i).server.version;

        // To iterate over tree to check parent node
        while (i) {
          // If table is partitioned table then return false
          if (!immediate_parent_table_found && (d._type == 'table' || d._type == 'partition')) {
            immediate_parent_table_found = true;
            if ('is_partitioned' in d && d.is_partitioned && s_version < 110000) {
              is_immediate_parent_table_partitioned = true;
            }
          }

          // If it is schema then allow user to c reate table
          if (_.indexOf(['schema'], d._type) > -1) {
            return !is_immediate_parent_table_partitioned;
          }else if (_.indexOf(['foreign_table', 'coll-foreign_table'], d._type) > -1) {
            return false;
          }
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

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new UniqueConstraintSchema({
          columns: ()=>getNodeListByName('column', treeNodeInfo, itemNodeData),
          spcname: ()=>getNodeListByName('tablespace', treeNodeInfo, itemNodeData, {}, (m)=>{
            return (m.label != 'pg_global');
          }),
          index: ()=>getNodeListByName('index', treeNodeInfo, itemNodeData, {jumpAfterNode: 'schema'}),
        }, treeNodeInfo);
      },
    });
  }

  return pgBrowser.Nodes['unique_constraint'];
});
