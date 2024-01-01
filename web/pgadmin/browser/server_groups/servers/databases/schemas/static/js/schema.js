/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import PGSchema from './schema.ui';
import { getNodePrivilegeRoleSchema } from '../../../../static/js/privilege.ui';
import { getNodeListByName } from '../../../../../../static/js/node_ajax';

define('pgadmin.node.schema', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser) {

  // Extend the browser's collection class for schema collection
  if (!pgBrowser.Nodes['coll-schema']) {
    pgBrowser.Nodes['coll-schema'] =
      pgBrowser.Collection.extend({
        node: 'schema',
        label: gettext('Schemas'),
        type: 'coll-schema',
        columns: ['name', 'namespaceowner', 'description'],
      });
  }
  // Extend the browser's node class for schema node
  if (!pgBrowser.Nodes['schema']) {
    pgBrowser.Nodes['schema'] = pgBrowser.Node.extend({
      parent_type: 'database',
      type: 'schema',
      sqlAlterHelp: 'sql-alterschema.html',
      sqlCreateHelp: 'sql-createschema.html',
      dialogHelp: url_for('help.static', {'filename': 'schema_dialog.html'}),
      label: gettext('Schema'),
      hasSQL:  true,
      canDrop: true,
      canDropCascade: true,
      hasDepends: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_schema_on_coll', node: 'coll-schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('Schema...'),
          data: {action: 'create'},
        },{
          name: 'create_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('Schema...'),
          data: {action: 'create'},
        },{
          name: 'create_schema', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('Schema...'),
          data: {action: 'create'}, enable: 'can_create_schema',
        },{
          name: 'generate_erd', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'generate_erd',
          category: 'erd', priority: 5, label: gettext('ERD For Schema')
        }]);
      },
      can_create_schema: function(node) {
        return pgBrowser.Nodes['database'].is_conn_allow.call(this, node);
      },
      callbacks: {
        /* Generate the ERD */
        generate_erd: function(args) {
          let input = args || {},
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i ? t.itemData(i) : undefined;
          pgAdmin.Tools.ERD.showErdTool(d, i, true);
        },
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        let schemaObj = pgBrowser.Nodes['schema'];
        return new PGSchema(
          (privileges)=>getNodePrivilegeRoleSchema(schemaObj, treeNodeInfo, itemNodeData, privileges),
          {
            roles:() => getNodeListByName('role', treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            }),
            server_info: pgBrowser.serverInfo[treeNodeInfo.server._id]
          },
          {
            namespaceowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name
          }
        );
      }
    });

    pgBrowser.tableChildTreeNodeHierarchy = function(i) {
      return pgBrowser.tree.getTreeNodeHierarchy(i);
    };
  }

  return pgBrowser.Nodes['schema'];
});
