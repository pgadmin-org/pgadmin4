/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName, getNodeListById} from '../../../../../../../static/js/node_ajax';
import FTSDictionarySchema from './fts_dictionary.ui';

define('pgadmin.node.fts_dictionary', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, pgAdmin, pgBrowser, schemaChild, schemaChildTreeNode
) {

  // Extend the collection class for FTS Dictionary
  if (!pgBrowser.Nodes['coll-fts_dictionary']) {
    pgAdmin.Browser.Nodes['coll-fts_dictionary'] =
      pgAdmin.Browser.Collection.extend({
        node: 'fts_dictionary',
        label: gettext('FTS Dictionaries'),
        type: 'coll-fts_dictionary',
        columns: ['name', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Extend the node class for FTS Dictionary
  if (!pgBrowser.Nodes['fts_dictionary']) {
    pgAdmin.Browser.Nodes['fts_dictionary'] = schemaChild.SchemaChildNode.extend({
      type: 'fts_dictionary',
      sqlAlterHelp: 'sql-altertsdictionary.html',
      sqlCreateHelp: 'sql-createtsdictionary.html',
      dialogHelp: url_for('help.static', {'filename': 'fts_dictionary_dialog.html'}),
      label: gettext('FTS Dictionary'),
      hasSQL: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        // Add context menus for FTS Dictionary
        pgBrowser.add_menus([{
          name: 'create_fts_dictionary_on_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Dictionary...'),
          data: {action: 'create'}, enable: 'canCreate',
        },{
          name: 'create_fts_dictionary_on_coll', node: 'coll-fts_dictionary',
          module: this, applies: ['object', 'context'],  priority: 4,
          callback: 'show_obj_properties', category: 'create',
          label: gettext('FTS Dictionary...'), data: {action: 'create'},
          enable: 'canCreate',
        },{
          name: 'create_fts_dictionary', node: 'fts_dictionary', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Dictionary...'),
          data: {action: 'create'},
          enable: 'canCreate',
        }]);
      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new FTSDictionarySchema(
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListById(pgBrowser.Nodes['schema'], treeNodeInfo, itemNodeData),
            fts_template: ()=>getNodeAjaxOptions('fetch_templates', this, treeNodeInfo, itemNodeData, {
              cacheNode: 'fts_template'
            })
          },
          {
            owner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            schema: itemNodeData._id,
          }
        );
      },
    });
  }

  return pgBrowser.Nodes['fts_dictionary'];
});
