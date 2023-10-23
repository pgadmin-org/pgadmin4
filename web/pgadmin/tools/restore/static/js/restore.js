/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeListByName } from '../../../../browser/static/js/node_ajax';
import getApiInstance from 'sources/api_instance';
import {retrieveAncestorOfTypeServer} from 'sources/tree/tree_utils';
import RestoreSchema, {getRestoreSaveOptSchema, getRestoreDisableOptionSchema, getRestoreMiscellaneousSchema, getRestoreTypeObjSchema, getRestoreSectionSchema} from './restore.ui';
import pgAdmin from 'sources/pgadmin';

define('tools.restore', [
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'tools/restore/static/js/menu_utils', 'sources/nodes/supported_database_node',
], function(
  gettext, url_for, pgBrowser, menuUtils, supportedNodes
) {

  // if module is already initialized, refer to that.
  if (pgBrowser.Restore) {
    return pgBrowser.Restore;
  }

  // Create an Object Restore of pgBrowser class
  pgBrowser.Restore = {
    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;

      // Define the nodes on which the menus to be appear
      let menus = [{
        name: 'restore_object',
        module: this,
        applies: ['tools'],
        callback: 'restoreObjects',
        priority: 2,
        label: gettext('Restore...'),
        icon: 'fa fa-upload',
        below: true,
        enable: supportedNodes.enabled.bind(
          null, pgBrowser.tree, menuUtils.restoreSupportedNodes
        ),
        data: {
          data_disabled: gettext('Please select any schema or table from the object explorer to Restore data.'),
        },
      }];

      for (let sup_node_val of menuUtils.restoreSupportedNodes) {
        menus.push({
          name: 'restore_' + sup_node_val,
          node: sup_node_val,
          module: this,
          applies: ['context'],
          callback: 'restoreObjects',
          priority: 2,
          label: gettext('Restore...'),
          enable: supportedNodes.enabled.bind(
            null, pgBrowser.tree, menuUtils.restoreSupportedNodes
          ),
        });
      }

      pgBrowser.add_menus(menus);
      return this;
    },
    getUISchema: function(treeItem) {
      let treeNodeInfo = pgBrowser.tree.getTreeNodeHierarchy(treeItem);
      const selectedNode = pgBrowser.tree.selected();
      let itemNodeData = pgBrowser.tree.findNodeByDomElement(selectedNode).getData();

      return new RestoreSchema(
        ()=>getRestoreSectionSchema({selectedNodeType: itemNodeData._type}),
        ()=>getRestoreTypeObjSchema({selectedNodeType: itemNodeData._type}),
        ()=>getRestoreSaveOptSchema({nodeInfo: treeNodeInfo}),
        ()=>getRestoreDisableOptionSchema({nodeInfo: treeNodeInfo}),
        ()=>getRestoreMiscellaneousSchema({nodeInfo: treeNodeInfo}),
        {
          role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData)
        },
        treeNodeInfo,
        pgBrowser
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
    setExtraParameters: function(treeInfo, nodeData) {
      let extraData = {};
      extraData['database'] = treeInfo.database._label;

      if('schema' in treeInfo) {
        extraData['schemas'] = [treeInfo.schema._label];
      }

      if('table' in treeInfo) {
        extraData['tables'] = [nodeData._label];
      }

      if('function' in treeInfo) {
        extraData['functions'] = [nodeData._label];
      }
      extraData['save_btn_icon'] = 'upload';
      return extraData;
    },
    url_for_utility_exists: function(id){
      return url_for('restore.utility_exists', {
        'sid': id,
      });
    },
    restoreObjects: function(_action, treeItem) {
      let that = this,
        tree = pgBrowser.tree,
        i = treeItem || tree.selected(),
        data = i ? tree.itemData(i) : undefined,
        treeNodeInfo = pgBrowser.tree.getTreeNodeHierarchy(treeItem);

      const serverInformation = retrieveAncestorOfTypeServer(pgBrowser, treeItem, gettext('Restore Error')),
        sid = serverInformation._type == 'database' ? serverInformation._pid : serverInformation._id,
        api = getApiInstance(),
        utility_exists_url = that.url_for_utility_exists(sid);

      return api({
        url: utility_exists_url,
        method: 'GET'
      }).then((res)=>{
        if (!res.data.success) {
          pgAdmin.Browser.notifier.alert(
            gettext('Utility not found'),
            gettext(res.data.errormsg)
          );
          return;
        }

        let schema = that.getUISchema(treeItem);
        let urlShortcut = 'restore.create_job',
          urlBase =  url_for(urlShortcut, {
            'sid': sid,
          }),
          extraData = that.setExtraParameters(treeNodeInfo, data);

        let sqlHelpUrl = 'backup.html',
          helpUrl = url_for('help.static', {
            'filename': 'restore_dialog.html',
          });

        pgAdmin.Browser.Events.trigger('pgadmin:utility:show', treeItem,
          gettext(`Restore (${pgBrowser.Nodes[data._type].label}: ${data.label})`),{
            schema, extraData, urlBase, sqlHelpUrl, helpUrl, saveBtnName: gettext('Restore')
          }, pgAdmin.Browser.stdW.md
        );
      }).catch(()=>{
        pgAdmin.Browser.notifier.alert(
          gettext('Utility not found'),
          gettext('Failed to fetch Utility information')
        );
      });
    },
  };
  return pgBrowser.Restore;
});
