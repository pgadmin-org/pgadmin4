/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import MViewSchema from './mview.ui';
import { getNodeListByName } from '../../../../../../../static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../../../static/js/privilege.ui';
import { getNodeVacuumSettingsSchema } from '../../../../../static/js/vacuum.ui';
import Notify from '../../../../../../../../static/js/helpers/Notifier';
import _ from 'lodash';

define('pgadmin.node.mview', [
  'sources/gettext', 'sources/url_for', 'jquery',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.node.schema.dir/child',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'sources/utils',
], function(
  gettext, url_for, $, pgAdmin, pgBrowser,
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
          category: 'create', priority: 1, 
          data: {action: 'create', check: true}, enable: 'canCreate',
          label: gettext('Materialized View...'),
        },{
          name: 'create_mview', node: 'mview', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, 
          data: {action: 'create', check: true}, enable: 'canCreate',
          label: gettext('Materialized View...'),
        },{
          name: 'create_mview', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 18, 
          data: {action: 'create', check: false}, enable: 'canCreate',
          label: gettext('Materialized View...'),
        },{
          name: 'refresh_mview_data', node: 'mview', module: this,
          priority: 1, callback: 'refresh_mview', category: 'refresh_mview',
          applies: ['object', 'context'], label: gettext('With data'),
          data: {concurrent: false, with_data: true}, 
        },{
          name: 'refresh_mview_nodata', node: 'mview',
          callback: 'refresh_mview', priority: 2, module: this,
          category: 'refresh_mview', applies: ['object', 'context'],
          label: gettext('With no data'), data: {
            concurrent: false, with_data: false,
          }, 
        },{
          name: 'refresh_mview_concurrent', node: 'mview', module: this,
          category: 'refresh_mview', enable: 'is_version_supported',
          data: {concurrent: true, with_data: true}, priority: 3,
          applies: ['object', 'context'], callback: 'refresh_mview',
          label: gettext('With data (concurrently)'), 
        },{
          name: 'refresh_mview_concurrent_nodata', node: 'mview', module: this,
          category: 'refresh_mview', enable: 'is_version_supported',
          data: {concurrent: true, with_data: false}, priority: 4,
          applies: ['object', 'context'], callback: 'refresh_mview',
          label: gettext('With no data (concurrently)'),
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

      refresh_mview: function(args) {
        let input = args || {},
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i  ? t.itemData(i) : undefined,
          server_data = null;

        if (!d)
          return false;

        let j = i;
        while (j) {
          let node_data = pgBrowser.tree.itemData(j);
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

        if (!commonUtils.hasBinariesConfiguration(pgBrowser, server_data)) {
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
                pgBrowser.BgProcessManager.startProcess(refreshed_res.data.job_id, refreshed_res.data.desc);
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
        });
      },

      is_version_supported: function(data, item) {
        let t = pgAdmin.Browser.tree,
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
