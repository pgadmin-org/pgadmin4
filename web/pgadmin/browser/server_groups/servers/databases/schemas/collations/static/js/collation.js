/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import CollationSchema from './collation.ui';
import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../../static/js/node_ajax';

define('pgadmin.node.collation', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, schemaChild,
  schemaChildTreeNode) {

  if (!pgBrowser.Nodes['coll-collation']) {
    pgAdmin.Browser.Nodes['coll-collation'] =
      pgAdmin.Browser.Collection.extend({
        node: 'collation',
        label: gettext('Collations'),
        type: 'coll-collation',
        columns: ['name', 'owner', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['collation']) {
    pgAdmin.Browser.Nodes['collation'] = schemaChild.SchemaChildNode.extend({
      type: 'collation',
      sqlAlterHelp: 'sql-altercollation.html',
      sqlCreateHelp: 'sql-createcollation.html',
      dialogHelp: url_for('help.static', {'filename': 'collation_dialog.html'}),
      label: gettext('Collation'),
      collection_type: 'coll-collation',
      hasSQL: true,
      hasDepends: true,
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_collation_on_coll', node: 'coll-collation', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Collation...'),
          icon: 'wcTabIcon icon-collation', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_collation', node: 'collation', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Collation...'),
          icon: 'wcTabIcon icon-collation', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_collation', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Collation...'),
          icon: 'wcTabIcon icon-collation', data: {action: 'create', check: false},
          enable: 'canCreate',
        },
        ]);

      },
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            var schemaInfo = args.node_info.schema;

            this.set({'owner': userInfo.name}, {silent: true});
            this.set({'schema': schemaInfo._label}, {silent: true});
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema', control: 'node-list-by-name',
          node: 'role',
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema',
        }
        ],
      }),
      getSchema: (treeNodeInfo, itemNodeData)=>{
        let nodeObj = pgAdmin.Browser.Nodes['collation'];
        let schema = new CollationSchema(
          {
            rolesList: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData, {cacheLevel: 'server'}),
            schemaList: ()=>getNodeListByName('schema', treeNodeInfo, itemNodeData, {cacheLevel: 'database'}),
            collationsList: ()=>getNodeAjaxOptions('get_collations', nodeObj, treeNodeInfo, itemNodeData, {cacheLevel: 'server'})
          },
          {
            owner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            schema: ('schema' in treeNodeInfo)? treeNodeInfo.schema.label : ''
          }
        );
        return schema;
      }
    });
  }
  return pgBrowser.Nodes['collation'];
});
