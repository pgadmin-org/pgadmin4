/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeListByName } from '../../../../../../../../../static/js/node_ajax';
import PrimaryKeySchema from './primary_key.ui';
import _ from 'lodash';

define('pgadmin.node.primary_key', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser) {

  // Extend the browser's node class for index constraint node
  if (!pgBrowser.Nodes['primary_key']) {
    pgAdmin.Browser.Nodes['primary_key'] = pgBrowser.Node.extend({
      type: 'primary_key',
      label: gettext('Primary key'),
      collection_type: 'coll-constraints',
      sqlAlterHelp: 'ddl-alter.html',
      sqlCreateHelp: 'ddl-constraints.html',
      dialogHelp: url_for('help.static', {filename: 'primary_key_dialog.html'}),
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
          name: 'create_primary_key_on_coll', node: 'coll-constraints', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Primary key'),
          icon: 'wcTabIcon icon-primary_key', data: {action: 'create', check: true},
          enable: 'canCreate',

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
          if (_.indexOf(['schema'], d._type) > -1) {
            if (is_immediate_parent_table_partitioned) {
              return false;
            }

            // There should be only one primary key per table.
            let children = t.children(arguments[1], false),
              primary_key_found = false;

            _.each(children, function(child){
              data = pgBrowser.tree.itemData(child);
              if (!primary_key_found && data._type == 'primary_key') {
                primary_key_found = true;
              }
            });
            return !primary_key_found;
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
        return new PrimaryKeySchema({
          columns: ()=>getNodeListByName('column', treeNodeInfo, itemNodeData),
          spcname: ()=>getNodeListByName('tablespace', treeNodeInfo, itemNodeData, {}, (m)=>{
            return (m.label != 'pg_global');
          }),
          index: ()=>getNodeListByName('index', treeNodeInfo, itemNodeData, {jumpAfterNode: 'schema'}),
        }, treeNodeInfo);
      },
      // Define the model for index constraint node
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',

        defaults: {
          name: undefined,
          oid: undefined,
          is_sys_obj: undefined,
          comment: undefined,
          spcname: undefined,
          index: undefined,
          fillfactor: undefined,
          condeferrable: undefined,
          condeferred: undefined,
          columns: [],
          include: [],
        },

        genResetColOptions: function() {
          let self = this;

          setTimeout(function () {
            self.custom_options();
            self.render.apply(self);
          }, 50);
        },

        genCustomOptions: function() {
          // We will add all the columns entered by user in table model
          let columns = this.model.top.get('columns'),
            added_columns_from_tables = [];

          if (columns.length > 0) {
            _.each(columns.models, function(m) {
              let col = m.get('name');
              if(!_.isUndefined(col) && !_.isNull(col)) {
                added_columns_from_tables.push(
                  {label: col, value: col, image:'icon-column'}
                );
              }
            });
          }
          // Set the values in to options so that user can select
          this.field.set('options', added_columns_from_tables);
        },
        checkReadOnly(m) {
          // If we are in table edit mode then
          if (_.has(m, 'top') && !_.isUndefined(m.top)
            && !m.top.isNew()) {
            // If OID is undefined then user is trying to add
            // new constraint which should be allowed for Unique
            return !_.isUndefined(m.get('oid'));
          }

          // We can't update columns of existing index constraint.
          return !m.isNew();
        },
        validate: function() {
          this.errorModel.clear();
          // Clear parent's error as well
          if (_.has(this, 'top')) {
            this.top.errorModel.clear();
          }

          let columns = this.get('columns'),
            index = this.get('index');

          if ((_.isUndefined(index) || String(index).replace(/^\s+|\s+$/g, '') == '') &&
            (_.isUndefined(columns) || _.isNull(columns) || columns.length < 1)) {
            let msg = gettext('Please specify columns for %s.', gettext('Primary key'));
            this.errorModel.set('columns', msg);
            return msg;
          }

          return null;
        },
      }),
    });
  }

  return pgBrowser.Nodes['primary_key'];
});
