/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import FTSParserSchema from './fts_parser.ui';
import { getNodeAjaxOptions, getNodeListById } from '../../../../../../../static/js/node_ajax';

define('pgadmin.node.fts_parser', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.node.schema.dir/child',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser, schemaChild, schemaChildTreeNode) {

  // Extend the collection class for fts parser
  if (!pgBrowser.Nodes['coll-fts_parser']) {
    pgAdmin.Browser.Nodes['coll-fts_parser'] =
      pgAdmin.Browser.Collection.extend({
        node: 'fts_parser',
        label: gettext('FTS Parsers'),
        type: 'coll-fts_parser',
        columns: ['name', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Extend the node class for fts parser
  if (!pgBrowser.Nodes['fts_parser']) {
    pgAdmin.Browser.Nodes['fts_parser'] = schemaChild.SchemaChildNode.extend({
      type: 'fts_parser',
      sqlAlterHelp: 'sql-altertsparser.html',
      sqlCreateHelp: 'sql-createtsparser.html',
      dialogHelp: url_for('help.static', {'filename': 'fts_parser_dialog.html'}),
      label: gettext('FTS Parser'),
      hasSQL: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        // Add context menus for fts parser
        pgBrowser.add_menus([{
          name: 'create_fts_parser_on_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Parser...'),
          data: {action: 'create'}, enable: 'canCreate',
        },{
          name: 'create_fts_parser_on_coll', node: 'coll-fts_parser',
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Parser...'),
          data: {action: 'create'}, module: this, enable: 'canCreate',
        },{
          name: 'create_fts_parser', node: 'fts_parser', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Parser...'),
          data: {action: 'create'}, enable: 'canCreate',
        }]);

      },

      getSchema: (treeNodeInfo, itemNodeData) => {
        let nodeObj = pgAdmin.Browser.Nodes['fts_parser'];
        return new FTSParserSchema(
          {
            prsstartList: () => getNodeAjaxOptions('start_functions', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database',
            }),
            prstokenList: () => getNodeAjaxOptions('token_functions', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database',
            }),
            prsendList: () => getNodeAjaxOptions('end_functions', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database',
            }),
            prslextypeList: () => getNodeAjaxOptions('lextype_functions', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database',
            }),
            prsheadlineList: () => getNodeAjaxOptions('headline_functions', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database',
            }),
            schemaList:() => getNodeListById(pgBrowser.Nodes['schema'], treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            })
          },
          {
            schema: itemNodeData._id,
          }
        );
      }
    });
  }

  return pgBrowser.Nodes['coll-fts_parser'];
});
