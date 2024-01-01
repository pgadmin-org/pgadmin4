/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName, getNodeListById} from '../../../../../../../static/js/node_ajax';
import FTSConfigurationSchema from './fts_configuration.ui';

define('pgadmin.node.fts_configuration', [
  'sources/gettext', 'sources/url_for', 'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, pgAdmin, pgBrowser, schemaChild, schemaChildTreeNode
) {

  // Extend the collection class for FTS Configuration
  if (!pgBrowser.Nodes['coll-fts_configuration']) {
    pgAdmin.Browser.Nodes['coll-fts_configuration'] =
      pgAdmin.Browser.Collection.extend({
        node: 'fts_configuration',
        label: gettext('FTS Configurations'),
        type: 'coll-fts_configuration',
        columns: ['name', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Extend the node class for FTS Configuration
  if (!pgBrowser.Nodes['fts_configuration']) {
    pgAdmin.Browser.Nodes['fts_configuration'] = schemaChild.SchemaChildNode.extend({
      type: 'fts_configuration',
      sqlAlterHelp: 'sql-altertsconfig.html',
      sqlCreateHelp: 'sql-createtsconfig.html',
      dialogHelp: url_for('help.static', {'filename': 'fts_configuration_dialog.html'}),
      label: gettext('FTS Configuration'),
      hasSQL: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        // Add context menus for FTS Configuration
        pgBrowser.add_menus([{
          name: 'create_fts_configuration_on_schema', node: 'schema',
          module: this, category: 'create', priority: 4,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          label: gettext('FTS Configuration...'),
          data: {action: 'create'}, enable: 'canCreate',
        },{
          name: 'create_fts_configuration_on_coll', module: this, priority: 4,
          node: 'coll-fts_configuration', applies: ['object', 'context'],
          callback: 'show_obj_properties', category: 'create',
          label: gettext('FTS Configuration...'), data: {action: 'create'},
          enable: 'canCreate',
        },{
          name: 'create_fts_configuration', node: 'fts_configuration',
          module: this, applies: ['object', 'context'],
          callback: 'show_obj_properties', category: 'create', priority: 4,
          label: gettext('FTS Configuration...'), data: {action: 'create'},
          enable: 'canCreate',
        }]);
      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new FTSConfigurationSchema(
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListById(pgBrowser.Nodes['schema'], treeNodeInfo, itemNodeData),
            parsers: ()=>getNodeAjaxOptions('parsers', this, treeNodeInfo, itemNodeData),
            copyConfig: ()=>getNodeAjaxOptions('copyConfig', this, treeNodeInfo, itemNodeData),
            tokens: ()=>getNodeAjaxOptions('tokens', this, treeNodeInfo, itemNodeData, {urlWithId: true}),
            dictionaries: ()=>getNodeAjaxOptions('dictionaries', this, treeNodeInfo, itemNodeData, {
              cacheLevel: 'fts_configuration',
              cacheNode: 'fts_configuration'
            }),
          },
          {
            owner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            schema: itemNodeData._id,
          }
        );
      },
    });
  }

  return pgBrowser.Nodes['coll-fts_configuration'];
});
