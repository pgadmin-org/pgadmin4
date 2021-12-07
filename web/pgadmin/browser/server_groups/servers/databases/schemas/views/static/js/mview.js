/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import MViewSchema from './mview.ui';
import { getNodeListByName } from '../../../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import { getNodeVacuumSettingsSchema } from '../../../../../static/js/vacuum.ui';
import Notify from '../../../../../../../../static/js/helpers/Notifier';

define('pgadmin.node.mview', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.alertifyjs', 'pgadmin.browser',
  'pgadmin.backform', 'pgadmin.node.schema.dir/child',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'sources/utils',
  'pgadmin.browser.server.privilege',
], function(
  gettext, url_for, $, _, pgAdmin, Alertify, pgBrowser, Backform,
  schemaChild, schemaChildTreeNode, commonUtils
) {

  /**
    Create and add a view collection into nodes
    @param {variable} label - Label for Node
    @param {variable} type - Type of Node
    @param {variable} columns - List of columns to
      display under under properties.
   */
  if (!pgBrowser.Nodes['coll-mview']) {
    pgBrowser.Nodes['coll-mview'] =
      pgBrowser.Collection.extend({
        node: 'mview',
        label: gettext('Materialized Views'),
        type: 'coll-mview',
        columns: ['name', 'owner', 'comment'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  /**
    Create and Add a View Node into nodes
    @param {variable} parent_type - The list of nodes
    under which this node to display
    @param {variable} type - Type of Node
    @param {variable} hasSQL - To show SQL tab
    @param {variable} canDrop - Adds drop view option
    in the context menu
    @param {variable} canDropCascade - Adds drop Cascade
    view option in the context menu
   */
  if (!pgBrowser.Nodes['mview']) {
    pgBrowser.Nodes['mview'] = schemaChild.SchemaChildNode.extend({
      type: 'mview',
      sqlAlterHelp: 'sql-altermaterializedview.html',
      sqlCreateHelp: 'sql-creatematerializedview.html',
      dialogHelp: url_for('help.static', {'filename': 'materialized_view_dialog.html'}),
      label: gettext('Materialized View'),
      hasSQL: true,
      hasDepends: true,
      hasScriptTypes: ['create', 'select'],
      collection_type: 'coll-mview',
      width: pgBrowser.stdW.md + 'px',
      Init: function() {

        // Avoid mulitple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        /**
          Add "create view" menu option into context and object menu
          for the following nodes:
          coll-mview, view and schema.
          @property {data} - Allow create view option on schema node or
          system view nodes.
         */
        pgAdmin.Browser.add_menu_category(
          'refresh_mview', gettext('Refresh View'), 18, '');
        pgBrowser.add_menus([{
          name: 'create_mview_on_coll', node: 'coll-mview', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, icon: 'wcTabIcon icon-mview',
          data: {action: 'create', check: true}, enable: 'canCreate',
          label: gettext('Materialized View...'),
        },{
          name: 'create_mview', node: 'mview', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, icon: 'wcTabIcon icon-mview',
          data: {action: 'create', check: true}, enable: 'canCreate',
          label: gettext('Materialized View...'),
        },{
          name: 'create_mview', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 18, icon: 'wcTabIcon icon-mview',
          data: {action: 'create', check: false}, enable: 'canCreate',
          label: gettext('Materialized View...'),
        },{
          name: 'refresh_mview_data', node: 'mview', module: this,
          priority: 1, callback: 'refresh_mview', category: 'refresh_mview',
          applies: ['object', 'context'], label: gettext('With data'),
          data: {concurrent: false, with_data: true}, icon: 'fa fa-recycle',
        },{
          name: 'refresh_mview_nodata', node: 'mview',
          callback: 'refresh_mview', priority: 2, module: this,
          category: 'refresh_mview', applies: ['object', 'context'],
          label: gettext('With no data'), data: {
            concurrent: false, with_data: false,
          }, icon: 'fa fa-sync-alt',
        },{
          name: 'refresh_mview_concurrent', node: 'mview', module: this,
          category: 'refresh_mview', enable: 'is_version_supported',
          data: {concurrent: true, with_data: true}, priority: 3,
          applies: ['object', 'context'], callback: 'refresh_mview',
          label: gettext('With data (concurrently)'), icon: 'fa fa-recycle',
        },{
          name: 'refresh_mview_concurrent_nodata', node: 'mview', module: this,
          category: 'refresh_mview', enable: 'is_version_supported',
          data: {concurrent: true, with_data: false}, priority: 4,
          applies: ['object', 'context'], callback: 'refresh_mview',
          label: gettext('With no data (concurrently)'),
          icon: 'fa fa-sync-alt',
        }]);
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return new MViewSchema(
          (privileges)=>getNodePrivilegeRoleSchema('', treeNodeInfo, itemNodeData, privileges),
          ()=>getNodeVacuumSettingsSchema(this, treeNodeInfo, itemNodeData),
          {
            role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            schema: ()=>getNodeListByName('schema', treeNodeInfo, itemNodeData, {cacheLevel: 'database'}),
            spcname: ()=>getNodeListByName('tablespace', treeNodeInfo, itemNodeData, {}, (m)=> {
              return (m.label != 'pg_global');
            }),
            nodeInfo: treeNodeInfo,
          },
          {
            owner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
            schema: treeNodeInfo.schema.label
          }
        );
      },
      /**
        Define model for the view node and specify the
        properties of the model in schema.
       */
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        initialize: function(attrs, args) {
          if (_.size(attrs) === 0) {
            // Set Selected Schema and Current User
            var schemaLabel = args.node_info.schema._label || 'public',
              userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({
              'schema': schemaLabel, 'owner': userInfo.name,
            }, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        defaults: {
          spcname: undefined,
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', disabled: 'inSchema',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text', mode: ['properties'],
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string',
          control: 'node-list-by-name', select2: { allowClear: false },
          node: 'role', disabled: 'inSchema',
        },{
          id: 'comment', label: gettext('Comment'), cell: 'string',
          type: 'multiline',
        }],
        sessChanged: function() {
          /* If only custom autovacuum option is enabled the check if the options table is also changed. */
          if(_.size(this.sessAttrs) == 2 && this.sessAttrs['autovacuum_custom'] && this.sessAttrs['toast_autovacuum']) {
            return this.get('vacuum_table').sessChanged() || this.get('vacuum_toast').sessChanged();
          }
          if(_.size(this.sessAttrs) == 1 && (this.sessAttrs['autovacuum_custom'] || this.sessAttrs['toast_autovacuum'])) {
            return this.get('vacuum_table').sessChanged() || this.get('vacuum_toast').sessChanged();
          }
          return pgBrowser.DataModel.prototype.sessChanged.apply(this);
        },
        validate: function(keys) {

          // Triggers specific error messages for fields
          var err = {},
            errmsg,
            field_name = this.get('name'),
            field_def = this.get('definition');

          if(_.indexOf(keys, 'autovacuum_custom'))
            if (_.indexOf(keys, 'autovacuum_enabled') != -1 ||
              _.indexOf(keys, 'toast_autovacuum_enabled') != -1 )
              return null;

          if (_.isUndefined(field_name) || _.isNull(field_name) ||
            String(field_name).replace(/^\s+|\s+$/g, '') == '') {
            err['name'] = gettext('Please specify name.');
            errmsg = err['name'];
            this.errorModel.set('name', errmsg);
            return errmsg;
          }else{
            this.errorModel.unset('name');
          }
          if (_.isUndefined(field_def) || _.isNull(field_def) ||
            String(field_def).replace(/^\s+|\s+$/g, '') == '') {
            err['definition'] = gettext('Please enter view definition.');
            errmsg = err['definition'];
            this.errorModel.set('definition', errmsg);
            return errmsg;
          }else{
            this.errorModel.unset('definition');
          }
          return null;
        },
        // We will disable everything if we are under catalog node
        inSchema: function() {
          if(this.node_info && 'catalog' in this.node_info)
          {
            return true;
          }
          return false;
        },

      }),

      refresh_mview: function(args) {
        var input = args || {},
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i  ? t.itemData(i) : undefined,
          server_data = null;

        if (!d)
          return false;

        let j = i;
        while (j) {
          var node_data = pgBrowser.tree.itemData(j);
          if (node_data._type == 'server') {
            server_data = node_data;
            break;
          }

          if (pgBrowser.tree.hasParent(j)) {
            j = pgBrowser.tree.parent(j);
          } else {
            Notify.alert(gettext('Please select server or child node from tree.'));
            break;
          }
        }

        if (!server_data) {
          return;
        }

        if (!commonUtils.hasBinariesConfiguration(pgBrowser, server_data, Alertify)) {
          return;
        }

        $.ajax({
          url: obj.generate_url(i, 'check_utility_exists' , d, true),
          type: 'GET',
          dataType: 'json',
        }).done(function(res) {
          if (!res.success) {
            Notify.alert(
              gettext('Utility not found'),
              res.errormsg
            );
            return;
          }
          // Make ajax call to refresh mview data
          $.ajax({
            url: obj.generate_url(i, 'refresh_data' , d, true),
            type: 'PUT',
            data: {'concurrent': args.concurrent, 'with_data': args.with_data},
            dataType: 'json',
          })
            .done(function(refreshed_res) {
              if (refreshed_res.data && refreshed_res.data.status) {
              //Do nothing as we are creating the job and exiting from the main dialog
                Notify.success(refreshed_res.data.info);
                pgBrowser.Events.trigger('pgadmin-bgprocess:created', obj);
              } else {
                Notify.alert(
                  gettext('Failed to create materialized view refresh job.'),
                  refreshed_res.errormsg
                );
              }
            })
            .fail(function(xhr, status, error) {
              Notify.pgRespErrorNotify(
                xhr, error, gettext('Failed to create materialized view refresh job.')
              );
            });
        }).fail(function() {
          Notify.alert(
            gettext('Utility not found'),
            gettext('Failed to fetch Utility information')
          );
          return;
        });
      },

      is_version_supported: function(data, item) {
        var t = pgAdmin.Browser.tree,
          i = item || t.selected(),
          info = t && t.getTreeNodeHierarchy(i),
          version = _.isUndefined(info) ? 0 : info.server.version;

        // disable refresh concurrently if server version is 9.3
        return (version >= 90400);
      },
    });
  }

  return pgBrowser.Nodes['mview'];
});
