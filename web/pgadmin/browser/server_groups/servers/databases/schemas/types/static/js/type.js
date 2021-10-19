/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// import TypeSchema from './type.ui';
import { getNodeListByName } from '../../../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import TypeSchema, { getCompositeSchema, getRangeSchema, getExternalSchema, getDataTypeSchema } from './type.ui';

define('pgadmin.node.type', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.backgrid', 'pgadmin.node.schema.dir/child',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, pgAdmin, pgBrowser, Backform, Backgrid,
  schemaChild, schemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-type']) {
    pgBrowser.Nodes['coll-type'] =
      pgBrowser.Collection.extend({
        node: 'type',
        label: gettext('Types'),
        type: 'coll-type',
        columns: ['name', 'typeowner', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['type']) {
    pgBrowser.Nodes['type'] = schemaChild.SchemaChildNode.extend({
      type: 'type',
      sqlAlterHelp: 'sql-altertype.html',
      sqlCreateHelp: 'sql-createtype.html',
      dialogHelp: url_for('help.static', {'filename': 'type_dialog.html'}),
      label: gettext('Type'),
      collection_type: 'coll-type',
      hasSQL: true,
      hasDepends: true,
      width: pgBrowser.stdW.md + 'px',
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_type_on_coll', node: 'coll-type', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Type...'),
          icon: 'wcTabIcon icon-type', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_type', node: 'type', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Type...'),
          icon: 'wcTabIcon icon-type', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_type', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Type...'),
          icon: 'wcTabIcon icon-type', data: {action: 'create', check: false},
          enable: 'canCreate',
        },
        ]);

      },
      ext_funcs: undefined,
      /* Few fields are kept since the properties tab for collection is not
      yet migrated to new react schema. Once the properties for collection
      is removed, remove this model */
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,
          is_sys_type: false,
          typtype: undefined,
        },

        // Default values!
        initialize: function(attrs, args) {
          if (_.size(attrs) === 0) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user,
              schemaInfo = args.node_info.schema;

            this.set({
              'typeowner': userInfo.name, 'schema': schemaInfo._label,
            }, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'schemaCheck',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'typeowner', label: gettext('Owner'), cell: 'string',
          control: 'node-list-by-name',
          type: 'text', mode: ['properties', 'create', 'edit'], node: 'role',
          disabled: 'inSchema', select2: {allowClear: false},
        }, {
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema',
        }]
      }),
      getSchema: (treeNodeInfo, itemNodeData) => {
        let nodeObj = pgAdmin.Browser.Nodes['type'];
        return new TypeSchema(
          (privileges)=>getNodePrivilegeRoleSchema(nodeObj, treeNodeInfo, itemNodeData, privileges),
          ()=>getCompositeSchema(nodeObj, treeNodeInfo, itemNodeData),
          ()=>getRangeSchema(nodeObj, treeNodeInfo, itemNodeData),
          ()=>getExternalSchema(nodeObj, treeNodeInfo, itemNodeData),
          ()=>getDataTypeSchema(nodeObj, treeNodeInfo, itemNodeData),
          {
            roles:() => getNodeListByName('role', treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            }),
            schemas:() => getNodeListByName('schema', treeNodeInfo, itemNodeData, {
              cacheLevel: 'database'
            }),
            server_info: pgBrowser.serverInfo[treeNodeInfo.server._id],
            node_info: treeNodeInfo
          },
          {
            typeowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            schema: 'catalog' in treeNodeInfo ? treeNodeInfo.catalog.label : treeNodeInfo.schema.label,
            // If create mode then by default open composite type
            typtype: 'c'
          }
        );
      }
    });
  }
  return pgBrowser.Nodes['type'];
});
