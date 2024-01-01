/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import getApiInstance from 'sources/api_instance';
import MaintenanceSchema, {getVacuumSchema} from './maintenance.ui';
import { getNodeListByName } from '../../../../browser/static/js/node_ajax';

define([
  'sources/gettext', 'sources/url_for', 'sources/pgadmin', 'pgadmin.browser',
  'tools/maintenance/static/js/menu_utils',
  'sources/nodes/supported_database_node'
], function(
  gettext, url_for, pgAdmin, pgBrowser, menuUtils, supportedNodes
) {

  pgAdmin = pgAdmin || window.pgAdmin || {};

  let pgTools = pgAdmin.Tools = pgAdmin.Tools || {};
  const api = getApiInstance();

  // Return back, this has been called more than once
  if (pgAdmin.Tools.maintenance)
    return pgAdmin.Tools.maintenance;

  pgTools.maintenance = {
    init: function() {

      // We do not want to initialize the module multiple times.
      if (this.initialized)
        return;

      this.initialized = true;

      let menus = [{
        name: 'maintenance',
        module: this,
        applies: ['tools'],
        callback: 'callback_maintenance',
        priority: 3,
        label: gettext('Maintenance...'),
        icon: 'fa fa-wrench',
        enable: supportedNodes.enabled.bind(
          null, pgBrowser.tree, menuUtils.maintenanceSupportedNodes
        ),
        data: {
          data_disabled: gettext('Please select any database from the object explorer to do Maintenance.'),
        },
      }];

      // Add supported menus into the menus list
      for (let sup_node_val of menuUtils.maintenanceSupportedNodes) {
        menus.push({
          name: 'maintenance_context_' + sup_node_val,
          node: sup_node_val,
          module: this,
          applies: ['context'],
          callback: 'callback_maintenance',
          priority: 10,
          label: gettext('Maintenance...'),
          enable: supportedNodes.enabled.bind(
            null, pgBrowser.tree, menuUtils.maintenanceSupportedNodes
          ),
          data: {
            data_disabled: gettext('Please select any database from the object explorer to do Maintenance.'),
          },
        });
      }
      pgBrowser.add_menus(menus);
    },
    getUISchema: function(treeItem) {
      let treeNodeInfo = pgBrowser.tree.getTreeNodeHierarchy(treeItem);
      const selectedNode = pgBrowser.tree.selected();
      let itemNodeData = pgBrowser.tree.findNodeByDomElement(selectedNode).getData();

      return new MaintenanceSchema(
        ()=>getVacuumSchema({
          tablespace: ()=>getNodeListByName('tablespace', treeNodeInfo, itemNodeData, {}, (m)=>{
            return (m.label != 'pg_global');
          })
        }),
        {
          nodeInfo: treeNodeInfo
        }
      );
    },
    saveCallBack: function(data) {
      if(data.errormsg) {
        pgAdmin.Browser.notifier.alert(
          gettext('Error'),
          gettext(data.errormsg)
        );
      } else {
        pgBrowser.BgProcessManager.startProcess(data.data.job_id, data.data.desc);
      }
    },
    setExtraParameters(treeInfo) {
      let extraData = {};
      extraData['database'] = treeInfo.database._label;
      if(treeInfo?.schema) {
        extraData['schema'] = treeInfo?.schema._label;
      }
      if(treeInfo?.table) {
        extraData['table'] = treeInfo?.table._label;
      }
      if(treeInfo?.mview) {
        extraData['table'] = treeInfo?.mview._label;
      }
      if(treeInfo?.primary_key) {
        extraData['primary_key'] = treeInfo?.primary_key._label;
      }
      if(treeInfo?.unique_constraint) {
        extraData['unique_constraint'] = treeInfo?.unique_constraint._label;
      }
      if(treeInfo?.index) {
        extraData['index'] = treeInfo?.index._label;
      }
      extraData['save_btn_icon'] = 'done';
      return extraData;
    },
    /*
      Open the dialog for the maintenance functionality
    */
    callback_maintenance: function(args, item) {
      let i = item || pgBrowser.tree.selected(),
        server_data = null;

      while (i) {
        let node_data = pgBrowser.tree.itemData(i);
        if (node_data._type == 'server') {
          server_data = node_data;
          break;
        }

        if (pgBrowser.tree.hasParent(i)) {
          i = pgBrowser.tree.parent(i);
        } else {
          pgAdmin.Browser.notifier.alert(gettext('Please select server or child node from tree.'));
          break;
        }
      }

      if (!server_data) {
        return;
      }

      let t = pgBrowser.tree;

      i = item || t.selected();

      let d = i  ? t.itemData(i) : undefined;

      if (!d)
        return;

      let treeInfo = t && t.getTreeNodeHierarchy(i);

      if (treeInfo.database._label.indexOf('=') >= 0) {
        pgAdmin.Browser.notifier.alert(
          gettext('Maintenance error'),
          gettext('Maintenance job creation failed. '+
          'Databases with = symbols in the name cannot be maintained using this utility.')
        );
        return;
      }

      const baseUrl = url_for('maintenance.utility_exists', {
        'sid': server_data._id,
      });

      let that = this;
      // Check psql utility exists or not.
      api({
        url: baseUrl,
        type:'GET',
      })
        .then(function(res) {
          if (!res.data.success) {
            pgAdmin.Browser.notifier.alert(
              gettext('Utility not found'),
              res.data.errormsg
            );
          } else{
            let schema = that.getUISchema(item);
            let urlShortcut = 'maintenance.create_job',
              urlBase =  url_for(urlShortcut, {
                'sid': treeInfo.server._id,
                'did': treeInfo.database._id
              });
            let extraData = that.setExtraParameters(treeInfo);

            let sqlHelpUrl = 'maintenance.html',
              helpUrl = url_for('help.static', {
                'filename': 'maintenance_dialog.html',
              });

            pgAdmin.Browser.Events.trigger('pgadmin:utility:show', item,
              gettext('Maintenance'),{
                schema, extraData, urlBase, sqlHelpUrl, helpUrl, saveBtnName: gettext('OK'),
              }, pgAdmin.Browser.stdW.md, pgAdmin.Browser.stdH.lg
            );
          }
        })
        .catch(function() {
          pgAdmin.Browser.notifier.alert(
            gettext('Utility not found'),
            gettext('Failed to fetch Utility information')
          );
        });
    },
  };

  return pgAdmin.Tools.maintenance;
});
