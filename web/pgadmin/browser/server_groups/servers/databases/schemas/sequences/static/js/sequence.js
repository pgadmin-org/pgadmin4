/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import SequenceSchema from './sequence.ui';

define('pgadmin.node.sequence', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, pgAdmin, pgBrowser, Backform, schemaChild,
  schemaChildTreeNode
) {

  // Extend the browser's collection class for sequence collection
  if (!pgBrowser.Nodes['coll-sequence']) {
    pgBrowser.Nodes['coll-sequence'] =
      pgBrowser.Collection.extend({
        node: 'sequence',
        label: gettext('Sequences'),
        type: 'coll-sequence',
        columns: ['name', 'seqowner', 'comment'],
        hasStatistics: true,
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Extend the browser's node class for sequence node
  if (!pgBrowser.Nodes['sequence']) {
    pgBrowser.Nodes['sequence'] = schemaChild.SchemaChildNode.extend({
      type: 'sequence',
      sqlAlterHelp: 'sql-altersequence.html',
      sqlCreateHelp: 'sql-createsequence.html',
      dialogHelp: url_for('help.static', {'filename': 'sequence_dialog.html'}),
      label: gettext('Sequence'),
      collection_type: 'coll-sequence',
      hasSQL: true,
      hasDepends: true,
      hasStatistics: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_sequence_on_coll', node: 'coll-sequence', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Sequence...'),
          icon: 'wcTabIcon icon-sequence', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_sequence', node: 'sequence', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Sequence...'),
          icon: 'wcTabIcon icon-sequence', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_sequence', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Sequence...'),
          icon: 'wcTabIcon icon-sequence', data: {action: 'create', check: false},
          enable: 'canCreate',
        },
        ]);

      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new SequenceSchema(
          (privileges)=>getNodePrivilegeRoleSchema(this, treeNodeInfo, itemNodeData, privileges),
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListByName('schema', treeNodeInfo, itemNodeData, {}, (m)=>{
              // If schema name start with pg_* then we need to exclude them
              if (m.label.match(/^pg_/)) {
                return false;
              }
              return true;
            }),
            allTables: ()=>getNodeListByName('table', treeNodeInfo, itemNodeData, {includeItemKeys: ['_id']}),
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
            seqowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            schema: itemNodeData.label,
          }
        );
      },

      // Define the model for sequence node.
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            var schemaInfo = args.node_info.schema;

            this.set({'seqowner': userInfo.name}, {silent: true});
            this.set({'schema': schemaInfo._label}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Define the schema for sequence node.
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text', mode: ['properties'],
        },{
          id: 'seqowner', label: gettext('Owner'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'], node: 'role',
          control: Backform.NodeListByNameControl,
        },{
          id: 'comment', label: gettext('Comment'), type: 'multiline',
          mode: ['properties', 'create', 'edit'],
        }],
      }),
    });
  }

  return pgBrowser.Nodes['sequence'];
});
