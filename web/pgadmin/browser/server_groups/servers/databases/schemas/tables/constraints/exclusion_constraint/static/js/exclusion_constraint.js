/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeExclusionConstraintSchema } from './exclusion_constraint.ui';
import _ from 'lodash';

define('pgadmin.node.exclusion_constraint', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.browser.collection',
], function(
  gettext, url_for, pgAdmin, pgBrowser
) {
  // Extend the browser's node class for exclusion constraint node
  if (!pgBrowser.Nodes['exclusion_constraint']) {
    pgAdmin.Browser.Nodes['exclusion_constraint'] = pgBrowser.Node.extend({
      type: 'exclusion_constraint',
      label: gettext('Exclusion constraint'),
      collection_type: 'coll-constraints',
      sqlAlterHelp: 'ddl-alter.html',
      sqlCreateHelp: 'ddl-constraints.html',
      dialogHelp: url_for('help.static', {'filename': 'exclusion_constraint_dialog.html'}),
      hasSQL: true,
      parent_type: ['table','partition'],
      canDrop: true,
      canDropCascade: true,
      hasDepends: true,
      hasStatistics: true,
      statsPrettifyFields: [gettext('Index size')],
      url_jump_after_node: 'schema',
      width: pgBrowser.stdW.md + 'px',
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_exclusion_constraint_on_coll', node: 'coll-constraints', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Exclusion constraint...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        }]);
      },
      is_not_valid: function(node) {
        return (node && !node.valid);
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return getNodeExclusionConstraintSchema(treeNodeInfo, itemNodeData, pgAdmin.Browser);
      },

      canCreate: function(itemData, item, data) {
        // If check is false then , we will allow create menu
        if (data && !data.check)
          return true;

        let t = pgBrowser.tree, i = item, d = itemData, parents = [],
          immediate_parent_table_found = false,
          is_immediate_parent_table_partitioned = false;
        // To iterate over tree to check parent node
        while (i) {
          // If table is partitioned table then return false
          if (!immediate_parent_table_found && (d._type == 'table' || d._type == 'partition')) {
            immediate_parent_table_found = true;
            if ('is_partitioned' in d && d.is_partitioned) {
              is_immediate_parent_table_partitioned = true;
            }
          }

          // If it is schema then allow user to create table
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
    });
  }

  return pgBrowser.Nodes['exclusion_constraint'];
});
