/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import Notify from '../../../../static/js/helpers/Notifier';
import {getUtilityView} from '../../../../browser/static/js/utility_view';
import getApiInstance from 'sources/api_instance';
import MaintenanceSchema, {getVacuumSchema} from './maintenance.ui';

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

      return new MaintenanceSchema(
        ()=>getVacuumSchema(),
        {
          nodeInfo: treeNodeInfo
        }
      );
    },
    saveCallBack: function(data) {
      if(data.errormsg) {
        Notify.alert(
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
          Notify.alert(gettext('Please select server or child node from tree.'));
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
        Notify.alert(
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
            Notify.alert(
              gettext('Utility not found'),
              res.data.errormsg
            );
          } else{

            pgBrowser.Node.registerUtilityPanel();
            let panel = pgBrowser.Node.addUtilityPanel(pgBrowser.stdW.md),
              j = panel.$container.find('.obj_properties').first();

            let schema = that.getUISchema(item);
            panel.title(gettext('Maintenance'));
            panel.focus();

            let urlShortcut = 'maintenance.create_job',
              jobUrl =  url_for(urlShortcut, {
                'sid': treeInfo.server._id,
                'did': treeInfo.database._id
              });
            let extraData = that.setExtraParameters(treeInfo);

            let sqlHelpUrl = 'maintenance.html',
              helpUrl = url_for('help.static', {
                'filename': 'maintenance_dialog.html',
              });

            getUtilityView(
              schema, treeInfo, 'select', 'dialog', j[0], panel, that.saveCallBack, extraData, 'OK', jobUrl, sqlHelpUrl, helpUrl);
          }
        })
        .catch(function() {
          Notify.alert(
            gettext('Utility not found'),
            gettext('Failed to fetch Utility information')
          );
        });
    },
  };

  return pgAdmin.Tools.maintenance;
});
