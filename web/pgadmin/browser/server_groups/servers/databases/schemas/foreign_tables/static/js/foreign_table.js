/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { getNodeListByName, getNodeAjaxOptions } from '../../../../../../../static/js/node_ajax';
import { getNodeVariableSchema } from '../../../../../static/js/variable.ui';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import ForeignTableSchema from './foreign_table.ui';
import _ from 'lodash';

/* Create and Register Foreign Table Collection and Node. */
define('pgadmin.node.foreign_table', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection','pgadmin.node.column',
  'pgadmin.node.constraints'
], function(
  gettext, url_for, pgBrowser, schemaChild, schemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-foreign_table']) {
    pgBrowser.Nodes['coll-foreign_table'] =
      pgBrowser.Collection.extend({
        node: 'foreign_table',
        label: gettext('Foreign Tables'),
        type: 'coll-foreign_table',
        columns: ['name', 'owner', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['foreign_table']) {
    pgBrowser.Nodes['foreign_table'] = schemaChild.SchemaChildNode.extend({
      type: 'foreign_table',
      sqlAlterHelp: 'sql-alterforeigntable.html',
      sqlCreateHelp: 'sql-createforeigntable.html',
      dialogHelp: url_for('help.static', {'filename': 'foreign_table_dialog.html'}),
      label: gettext('Foreign Table'),
      collection_type: 'coll-foreign_table',
      hasSQL: true,
      hasDepends: true,
      width: pgBrowser.stdW.md + 'px',
      hasScriptTypes: ['create', 'select', 'insert', 'update', 'delete'],
      parent_type: ['schema'],
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_foreign_table_on_coll', node: 'coll-foreign_table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Table...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_foreign_table', node: 'foreign_table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Table...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_foreign_table', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Table...'),
          data: {action: 'create', check: false}, enable: 'canCreate',
        },
        ]);

      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new ForeignTableSchema(
          (privileges)=>getNodePrivilegeRoleSchema('', treeNodeInfo, itemNodeData, privileges),
          ()=>getNodeVariableSchema(this, treeNodeInfo, itemNodeData, false, false),
          (params)=>{
            return getNodeAjaxOptions('get_columns', pgBrowser.Nodes['foreign_table'], treeNodeInfo, itemNodeData, {urlParams: params, useCache:false});
          },
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListByName('schema', treeNodeInfo, itemNodeData, {cacheLevel: 'database'}),
            foreignServers: ()=>getNodeAjaxOptions('get_foreign_servers', this, treeNodeInfo, itemNodeData, {cacheLevel: 'database'}, (res) => {
              return _.reject(res, function(o) {
                return o.label == '' || o.label == null;
              });
            }),
            tables: ()=>getNodeAjaxOptions('get_tables', this, treeNodeInfo, itemNodeData, {cacheLevel: 'database'}),
            nodeInfo: treeNodeInfo,
            nodeData: itemNodeData,
            pgBrowser: pgBrowser
          },
          {
            owner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            basensp: treeNodeInfo.schema ? treeNodeInfo.schema.label : ''
          }
        );
      },
    });

  }

  return pgBrowser.Nodes['foreign_table'];
});
