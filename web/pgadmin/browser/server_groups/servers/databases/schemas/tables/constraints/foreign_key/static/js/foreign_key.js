/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeForeignKeySchema } from './foreign_key.ui';
import _ from 'lodash';
import getApiInstance from '../../../../../../../../../../static/js/api_instance';

define('pgadmin.node.foreign_key', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.browser.collection',
], function(
  gettext, url_for, pgAdmin, pgBrowser
) {
  // Extend the browser's node class for foreign key node
  if (!pgBrowser.Nodes['foreign_key']) {
    pgAdmin.Browser.Nodes['foreign_key'] = pgBrowser.Node.extend({
      type: 'foreign_key',
      label: gettext('Foreign key'),
      collection_type: 'coll-constraints',
      sqlAlterHelp: 'ddl-alter.html',
      sqlCreateHelp: 'ddl-constraints.html',
      dialogHelp: url_for('help.static', {'filename': 'foreign_key_dialog.html'}),
      hasSQL: true,
      parent_type: ['table','partition'],
      canDrop: true,
      canDropCascade: true,
      hasDepends: true,
      url_jump_after_node: 'schema',
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_foreign_key_on_coll', node: 'coll-constraints', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign key...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'validate_foreign_key', node: 'foreign_key', module: this,
          applies: ['object', 'context'], callback: 'validate_foreign_key',
          category: 'validate', priority: 4, label: gettext('Validate foreign key'),
          enable : 'is_not_valid',
        },
        ]);
      },
      is_not_valid: function(node) {
        return (node && !node.valid);
      },
      callbacks: {
        validate_foreign_key: function(args) {
          let input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i  ? t.itemData(i) : undefined;

          if (d) {
            let data = d;
            getApiInstance().get(obj.generate_url(i, 'validate', d, true))
              .then(({data: res})=>{
                if (res.success == 1) {
                  pgAdmin.Browser.notifier.success(res.info);
                  t.removeIcon(i);
                  data.valid = true;
                  data.icon = 'icon-foreign_key';
                  t.addIcon(i, {icon: data.icon});
                  setTimeout(function() {t.deselect(i);}, 10);
                  setTimeout(function() {t.select(i);}, 100);
                }
              })
              .catch((error)=>{
                pgAdmin.Browser.notifier.pgRespErrorNotify(error);
                t.unload(i);
              });
          }
          return false;
        },
      },
      getSchema: (treeNodeInfo, itemNodeData)=>{
        return getNodeForeignKeySchema(treeNodeInfo, itemNodeData, pgAdmin.Browser);
      },
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
          // If table is partitioned table then return false
          if (!immediate_parent_table_found && (d._type == 'table' || d._type == 'partition')) {
            immediate_parent_table_found = true;
            if ('is_partitioned' in d && d.is_partitioned && s_version < 110000) {
              is_immediate_parent_table_partitioned = true;
            }
          }

          // If it is schema then allow user to c reate table
          if (_.indexOf(['schema'], d._type) > -1){
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
    });
  }

  return pgBrowser.Nodes['foreign_key'];
});
