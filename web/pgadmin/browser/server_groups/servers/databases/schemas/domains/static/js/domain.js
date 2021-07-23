/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../../static/js/node_ajax';
import DomainSchema from './domain.ui';

// Domain Module: Collection and Node.
define('pgadmin.node.domain', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform', 'pgadmin.backgrid',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, Backbone, pgAdmin, pgBrowser, Backform, Backgrid,
  schemaChild, schemaChildTreeNode
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
          icon: 'wcTabIcon icon-domain', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_domain', node: 'domain', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Domain...'),
          icon: 'wcTabIcon icon-domain', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_domain', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Domain...'),
          icon: 'wcTabIcon icon-domain', data: {action: 'create', check: false},
          enable: 'canCreate',
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

      // Domain Node Model
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            // Set Selected Schema
            var schema = args.node_info.schema.label;
            this.set({'basensp': schema}, {silent: true});

            // Set Current User
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({'owner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        // Domain Schema
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string', control: Backform.NodeListByNameControl,
          node: 'role',  type: 'text', mode: ['edit', 'create', 'properties'],
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline',
        }],
      }),
    });

  }

  return pgBrowser.Nodes['domain'];
});
