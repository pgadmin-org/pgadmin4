/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import getApiInstance from 'sources/api_instance';
import ImportExportSchema from './import_export.ui';
import { getNodeListByName, getNodeAjaxOptions } from '../../../../browser/static/js/node_ajax';

define([
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser',
  'sources/nodes/supported_database_node',
], function(
  gettext, url_for, pgAdmin, pgBrowser, supportedNodes) {

  pgAdmin = pgAdmin || window.pgAdmin || {};

  let pgTools = pgAdmin.Tools = pgAdmin.Tools || {};
  const api = getApiInstance();

  // Return back, this has been called more than once
  if (pgAdmin.Tools.import_utility)
    return pgAdmin.Tools.import_utility;

  pgTools.import_utility = {
    init: function() {
      // We do not want to initialize the module multiple times.
      if (this.initialized)
        return;

      this.initialized = true;

      // Initialize the context menu to display the import options when user open the context menu for table
      pgBrowser.add_menus([{
        name: 'import',
        node: 'table',
        module: this,
        applies: ['tools', 'context'],
        callback: 'callback_import_export',
        category: 'import',
        priority: 3,
        label: gettext('Import/Export Data...'),
        enable: supportedNodes.enabled.bind(
          null, pgBrowser.tree, ['table']
        ),
        data: {
          data_disabled: gettext('Please select any table from the object explorer to Import/Export data.'),
        },
      }]);
    },
    getUISchema: function(treeItem) {
      let treeNodeInfo = pgBrowser.tree.getTreeNodeHierarchy(treeItem);
      const selectedNode = pgBrowser.tree.selected();
      let itemNodeData = pgBrowser.tree.findNodeByDomElement(selectedNode).getData();

      return new ImportExportSchema(
        {
          encoding: ()=>getNodeAjaxOptions('get_encodings', pgBrowser.Nodes['database'], treeNodeInfo, itemNodeData, {cacheNode: 'database',cacheLevel: 'server'}),
          columns: ()=>getNodeListByName('column', treeNodeInfo, itemNodeData, { cacheLevel: 'column', cacheNode: 'column', includeItemKeys: ['_id']}, ()=>true, (res)=>{
            let columnsList = [];
            res.forEach(d => {
              if (d._id > 0) {
                columnsList.push({label: d.label, value: d.value, image:'icon-column', selected: true});
              }
            });
            return columnsList;
          }),
        }
      );
    },

    importExportCallBack: function(data) {
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
      extraData['schema'] = treeInfo.schema._label;
      extraData['table'] = treeInfo.table._label;
      extraData['save_btn_icon'] = 'done';
      return extraData;
    },

    /*
      Open the dialog for the import functionality
    */
    callback_import_export: function(args, item) {
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

      const baseUrlUtilitCheck = url_for('import_export.utility_exists', {
        'sid': server_data._id,
      });

      // Check psql utility exists or not.
      api({
        url: baseUrlUtilitCheck,
        type:'GET',
      })
        .then((res)=>{
          if (!res.data.success) {
            pgAdmin.Browser.notifier.alert(
              gettext('Utility not found'),
              res.data.errormsg
            );
          }else{
            // Open the dialog for the import/export module
            let schema = this.getUISchema(item);
            let urlShortcut = 'import_export.create_job',
              urlBase =  url_for(urlShortcut, {
                'sid': treeInfo.server._id,
              });
            let extraData = this.setExtraParameters(treeInfo);

            let sqlHelpUrl = 'sql-copy.html',
              helpUrl = url_for('help.static', {
                'filename': 'import_export_data.html',
              });

            pgAdmin.Browser.Events.trigger('pgadmin:utility:show', item,
              gettext('Import/Export data - table \'%s\'', treeInfo.table.label),{
                schema, extraData, urlBase, sqlHelpUrl, helpUrl, actionType: 'select', saveBtnName: gettext('OK'),
              }, pgAdmin.Browser.stdW.md
            );
          }
        })
        .catch(()=>{
          pgAdmin.Browser.notifier.alert(
            gettext('Utility not found'),
            gettext('Failed to fetch Utility information')
          );
        });
    },
  };

  return pgAdmin.Tools.import_utility;
});
