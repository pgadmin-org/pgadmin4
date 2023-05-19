/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import FTSTemplateSchema from './fts_template.ui';
import { getNodeAjaxOptions, getNodeListById } from '../../../../../../../static/js/node_ajax';

define('pgadmin.node.fts_template', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.node.schema.dir/child',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser, schemaChild, schemaChildTreeNode) {

  // Extend the collection class for fts template
  if (!pgBrowser.Nodes['coll-fts_template']) {
    pgAdmin.Browser.Nodes['coll-fts_template'] =
      pgAdmin.Browser.Collection.extend({
        node: 'fts_template',
        label: gettext('FTS Templates'),
        type: 'coll-fts_template',
        columns: ['name', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Extend the node class for fts template
  if (!pgBrowser.Nodes['fts_template']) {
    pgAdmin.Browser.Nodes['fts_template'] = schemaChild.SchemaChildNode.extend({
      type: 'fts_template',
      sqlAlterHelp: 'sql-altertstemplate.html',
      sqlCreateHelp: 'sql-createtstemplate.html',
      dialogHelp: url_for('help.static', {'filename': 'fts_template_dialog.html'}),
      label: gettext('FTS Template'),
      hasSQL: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        // Add context menus for fts template
        pgBrowser.add_menus([{
          name: 'create_fts_template_on_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Template...'),
          data: {action: 'create'}, enable: 'canCreate',
        },{
          name: 'create_fts_template_on_coll', node: 'coll-fts_template', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Template...'),
          data: {action: 'create'}, enable: 'canCreate',
        },{
          name: 'create_fts_template', node: 'fts_template', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('FTS Template...'),
          data: {action: 'create'}, enable: 'canCreate',
        }]);

      },

      getSchema: (treeNodeInfo, itemNodeData) => {
        let nodeObj = pgAdmin.Browser.Nodes['fts_template'];
        return new FTSTemplateSchema(
          {
            initFunctionList:()=>getNodeAjaxOptions('get_init', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            }),
            lexisFunctionList:()=>getNodeAjaxOptions('get_lexize', nodeObj, treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            }),
            schemaList:()=>getNodeListById(pgBrowser.Nodes['schema'], treeNodeInfo, itemNodeData),
          },
          {
            schema: itemNodeData._id,
          }
        );
      }
    });
  }

  return pgBrowser.Nodes['fts_template'];
});
