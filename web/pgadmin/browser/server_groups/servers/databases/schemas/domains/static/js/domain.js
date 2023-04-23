/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../../static/js/node_ajax';
import DomainSchema from './domain.ui';

// Domain Module: Collection and Node.
define('pgadmin.node.domain', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, pgBrowser, schemaChild, schemaChildTreeNode
) {

  // Define Domain Collection Node
  if (!pgBrowser.Nodes['coll-domain']) {
    pgBrowser.Nodes['coll-domain'] =
      pgBrowser.Collection.extend({
        node: 'domain',
        label: gettext('Domains'),
        type: 'coll-domain',
        columns: ['name', 'owner', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Domain Node
  if (!pgBrowser.Nodes['domain']) {
    pgBrowser.Nodes['domain'] = schemaChild.SchemaChildNode.extend({
      type: 'domain',
      sqlAlterHelp: 'sql-alterdomain.html',
      sqlCreateHelp: 'sql-createdomain.html',
      dialogHelp: url_for('help.static', {'filename': 'domain_dialog.html'}),
      label: gettext('Domain'),
      collection_type: 'coll-domain',
      hasSQL: true,
      hasDepends: true,
      Init: function() {
        // Avoid mulitple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_domain_on_coll', node: 'coll-domain', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Domain...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_domain', node: 'domain', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Domain...'),
          data: {action: 'create', check: true}, enable: 'canCreate',
        },{
          name: 'create_domain', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Domain...'),
          data: {action: 'create', check: false}, enable: 'canCreate',
        },
        ]);

      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new DomainSchema(
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListByName('schema', treeNodeInfo, itemNodeData, {
              cacheLevel: 'database',
              cacheNode: 'database'
            }),
            basetype: ()=>getNodeAjaxOptions('get_types', this, treeNodeInfo, itemNodeData, {
              cacheNode: 'type'
            }),
            collation: ()=>getNodeAjaxOptions('get_collations', this, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database',
              cacheNode: 'schema'
            }),
          },
          {
            owner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            schema: itemNodeData.label,
            basensp: itemNodeData.label,
          }
        );
      },
    });

  }

  return pgBrowser.Nodes['domain'];
});
