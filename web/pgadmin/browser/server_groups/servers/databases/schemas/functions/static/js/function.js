/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName, getNodeListById} from '../../../../../../../static/js/node_ajax';
import FunctionSchema from './function.ui';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import { getNodeVariableSchema } from '../../../../../static/js/variable.ui';
import _ from 'lodash';

/* Create and Register Function Collection and Node. */
define('pgadmin.node.function', [
  'sources/gettext', 'sources/url_for', 'jquery', 'backbone',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection', 'pgadmin.browser.server.privilege',
], function(
  gettext, url_for, $, Backbone, pgAdmin, pgBrowser, Backform, schemaChild,
  schemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-function']) {
    pgBrowser.Nodes['coll-function'] =
      pgBrowser.Collection.extend({
        node: 'function',
        label: gettext('Functions'),
        type: 'coll-function',
        columns: ['name', 'funcowner', 'description'],
        hasStatistics: true,
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }
  if (!pgBrowser.Nodes['function']) {

    pgBrowser.Nodes['function'] = schemaChild.SchemaChildNode.extend({
      type: 'function',
      sqlAlterHelp: 'sql-alterfunction.html',
      sqlCreateHelp: 'sql-createfunction.html',
      dialogHelp: url_for('help.static', {'filename': 'function_dialog.html'}),
      label: gettext('Function'),
      collection_type: 'coll-function',
      hasSQL: true,
      hasDepends: true,
      width: pgBrowser.stdW.md + 'px',
      hasStatistics: true,
      hasScriptTypes: ['create', 'select'],
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_function_on_coll', node: 'coll-function', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Function...'),
          icon: 'wcTabIcon icon-function', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_function', node: 'function', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Function...'),
          icon: 'wcTabIcon icon-function', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_function', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Function...'),
          icon: 'wcTabIcon icon-function', data: {action: 'create', check: false},
          enable: 'canCreate',
        },
        ]);

      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new FunctionSchema(
          (privileges)=>getNodePrivilegeRoleSchema(this, treeNodeInfo, itemNodeData, privileges),
          ()=>getNodeVariableSchema(this, treeNodeInfo, itemNodeData, false, false),
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListById(pgBrowser.Nodes['schema'], treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            }
            ),
            getTypes: ()=>getNodeAjaxOptions('get_types', this, treeNodeInfo, itemNodeData),
            getLanguage: ()=>getNodeAjaxOptions('get_languages', this, treeNodeInfo, itemNodeData),
            getSupportFunctions: ()=>getNodeAjaxOptions('get_support_functions', this, treeNodeInfo, itemNodeData, {
              cacheNode: 'function'
            }),

          },
          {
            node_info: treeNodeInfo,
          },
          {
            type: pgBrowser.Nodes['function'].type,
          },
          {
            funcowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            pronamespace: treeNodeInfo.schema ? treeNodeInfo.schema._id : null,
            lanname: 'sql',
          }
        );
      },
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            // Set Selected Schema
            var schema_id = args.node_info.schema._id;
            this.set({'pronamespace': schema_id}, {silent: true});

            // Set Current User
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({'funcowner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'isDisabled',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'funcowner', label: gettext('Owner'), cell: 'string',
          control: Backform.NodeListByNameControl, node: 'role',  type:
          'text', disabled: 'isDisabled',
        },{
          id: 'pronamespace', label: gettext('Schema'), cell: 'string',
          control: 'node-list-by-id', type: 'text', cache_level: 'database',
          node: 'schema', disabled: 'isDisabled', mode: ['create', 'edit'],
        },
        ],
      }),
    });

  }

  return pgBrowser.Nodes['function'];
});
