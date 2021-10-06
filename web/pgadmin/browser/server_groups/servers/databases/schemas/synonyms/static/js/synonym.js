/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeAjaxOptions, getNodeListByName } from '../../../../../../../static/js/node_ajax';
import SynonymSchema from './synonym.ui';

define('pgadmin.node.synonym', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.alertifyjs',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, alertify,
  schemaChild, schemaChildTreeNode) {

  if (!pgBrowser.Nodes['coll-synonym']) {
    pgAdmin.Browser.Nodes['coll-synonym'] =
      pgAdmin.Browser.Collection.extend({
        node: 'synonym',
        label: gettext('Synonyms'),
        type: 'coll-synonym',
        columns: ['name', 'owner','is_public_synonym'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['synonym']) {
    pgAdmin.Browser.Nodes['synonym'] = schemaChild.SchemaChildNode.extend({
      type: 'synonym',
      epasHelp: true,
      dialogHelp: url_for('help.static', {'filename': 'synonym_dialog.html'}),
      label: gettext('Synonym'),
      collection_type: 'coll-synonym',
      hasSQL: true,
      hasDepends: true,
      parent_type: ['schema', 'catalog'],
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_synonym_on_coll', node: 'coll-synonym', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Synonym...'),
          icon: 'wcTabIcon icon-synonym', data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },{
          name: 'create_synonym', node: 'synonym', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Synonym...'),
          icon: 'wcTabIcon icon-synonym', data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },{
          name: 'create_synonym', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Synonym...'),
          icon: 'wcTabIcon icon-synonym', data: {action: 'create', check: true,
            data_disabled: gettext('This option is only available on EPAS servers.')},
          enable: 'canCreate',
        },
        ]);

      },

      getSchema: function(treeNodeInfo, itemNodeData) {
        return new SynonymSchema(
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListByName('schema', treeNodeInfo, itemNodeData, {
              cacheLevel: 'database',
              cacheNode: 'database'
            }),
            synobjschema: ()=>getNodeListByName('schema', treeNodeInfo, itemNodeData, {}, (m)=>{
              // Exclude PPAS catalogs
              var exclude_catalogs = ['pg_catalog', 'sys', 'dbo', 'pgagent', 'information_schema', 'dbms_job_procedure'];
              return m && _.indexOf(exclude_catalogs, m.label) == -1;
            }),
            getTargetObjectOptions: (targettype, synobjschema) =>
            {
              return getNodeAjaxOptions('get_target_objects', this, treeNodeInfo,
                itemNodeData, {urlParams: {'trgTyp' : targettype, 'trgSchema' : synobjschema}, useCache: false});
            },
          },
          treeNodeInfo,
          {
            owner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            schema: itemNodeData.label,
            synobjschema: itemNodeData.label,
          }
        );
      },

      model: pgAdmin.Browser.Node.Model.extend({
        isNew: function() {
          return !this.fetchFromServer;
        },
        idAttribute: 'oid',
        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);

          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            var schemaInfo = args.node_info.schema;
            this.set({
              'owner': userInfo.name,
              'synobjschema': schemaInfo._label,
              'schema': schemaInfo._label,
              'targettype': 'r',
            }, {silent: true});
          } else {
            this.fetchFromServer = true;
          }
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);

        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema', readonly: function(m) { return !m.isNew(); },
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text', mode: ['properties'],
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          readonly: true , control: 'node-list-by-name',
          node: 'role', visible: false,
        }],

        // We will disable everything if we are under catalog node
        inSchema: function() {
          if(this.node_info &&  'catalog' in this.node_info)
          {
            return true;
          }
          return false;
        },
      }),
      canCreate: function(itemData, item, data) {
        //If check is false then , we will allow create menu
        if (data && data.check == false)
          return true;

        var treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
          server = treeData['server'];

        if (server && server.server_type === 'pg')
          return false;

        // If it is catalog then don't allow user to create synonyms
        if (treeData['catalog'] != undefined)
          return false;

        // by default we do not want to allow create menu
        return true;
      },
    });

  }

  return pgBrowser.Nodes['synonym'];
});
