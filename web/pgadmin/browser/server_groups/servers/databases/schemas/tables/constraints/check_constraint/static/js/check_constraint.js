/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import CheckConstraintSchema from './check_constraint.ui';
import _ from 'lodash';
import getApiInstance from '../../../../../../../../../../static/js/api_instance';

// Check Constraint Module: Node
define('pgadmin.node.check_constraint', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser, schemaChildTreeNode) {

  // Check Constraint Node
  if (!pgBrowser.Nodes['check_constraint']) {
    pgAdmin.Browser.Nodes['check_constraint'] = pgBrowser.Node.extend({
      type: 'check_constraint',
      label: gettext('Check'),
      collection_type: 'coll-constraints',
      sqlAlterHelp: 'ddl-alter.html',
      sqlCreateHelp: 'ddl-constraints.html',
      dialogHelp: url_for('help.static', {'filename': 'check_dialog.html'}),
      hasSQL: true,
      hasDepends: true,
      parent_type: ['table','partition','foreign_table'],
      url_jump_after_node: 'schema',
      Init: function() {
        // Avoid mulitple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_check_constraint_on_coll', node: 'coll-constraints', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 5, label: gettext('Check...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'validate_check_constraint', node: 'check_constraint', module: this,
          applies: ['object', 'context'], callback: 'validate_check_constraint',
          category: 'validate', priority: 4, label: gettext('Validate check constraint'),
          enable : 'is_not_valid', data: {action: 'edit', check: true},
        },
        ]);

      },
      is_not_valid: function(itemData, item, data) {
        if (this.canCreate(itemData, item, data)) {
          return (itemData && !itemData.valid);
        } else {
          return false;
        }
      },
      callbacks: {
        validate_check_constraint: function(args) {
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
                  data.icon = 'icon-check_constraint';
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
      canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      getSchema: function(){
        return new CheckConstraintSchema();
      },
      // Below function will enable right click menu for creating check constraint.
      canCreate: function(itemData, item, data) {
        // If check is false then , we will allow create menu
        if (data && !data.check)
          return true;

        let t = pgBrowser.tree, i = item, d = itemData, parents = [];
        // To iterate over tree to check parent node
        while (i) {
          // If it is schema then allow user to c reate table
          if (_.indexOf(['schema'], d._type) > -1)
            return true;
          parents.push(d._type);
          i = t.hasParent(i) ? t.parent(i) : null;
          d = i ? t.itemData(i) : null;
        }
        // If node is under catalog then do not allow 'create' menu
        return (_.indexOf(parents, 'catalog') <= -1);
      },
    });

  }

  return pgBrowser.Nodes['check_constraint'];
});
