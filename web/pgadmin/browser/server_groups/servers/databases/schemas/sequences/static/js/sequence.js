/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import SequenceSchema from './sequence.ui';

define('pgadmin.node.sequence', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, pgBrowser, schemaChild, schemaChildTreeNode
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
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_sequence', node: 'sequence', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Sequence...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_sequence', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Sequence...'),
          data: {action: 'create', check: false}, enable: 'canCreate',
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
              return !(m.label.match(/^pg_/));
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
    });
  }

  return pgBrowser.Nodes['sequence'];
});
