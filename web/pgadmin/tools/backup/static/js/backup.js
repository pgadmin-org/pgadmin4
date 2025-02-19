/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { getNodeListByName, getNodeAjaxOptions } from '../../../../browser/static/js/node_ajax';
import BackupSchema, {getSectionSchema, getTypeObjSchema, getSaveOptSchema, getDisabledOptionSchema, getMiscellaneousSchema, getExcludePatternsSchema} from './backup.ui';
import BackupGlobalSchema, {getMiscellaneousSchema as getMiscellaneousGlobalSchema} from './backupGlobal.ui';
import getApiInstance from 'sources/api_instance';
import {retrieveAncestorOfTypeServer} from 'sources/tree/tree_utils';
import pgAdmin from 'sources/pgadmin';

// Backup dialog
define([
  'sources/gettext', 'sources/url_for', 'pgadmin.browser',
  'tools/backup/static/js/menu_utils',
  'sources/nodes/supported_database_node',
], function(
  gettext, url_for, pgBrowser, menuUtils, supportedNodes
) {

  // if module is already initialized, refer to that.
  if (pgBrowser.Backup) {
    return pgBrowser.Backup;
  }

  /*
  =====================
  TODO LIST FOR BACKUP:
  =====================
  1) Add Object tree on object tab which allows user to select
     objects which can be backed up
  2) Allow user to select/deselect objects
  3) If database is selected in browser
     show all database children objects selected in Object tree
  4) If schema is selected in browser
     show all schema children objects selected in Object tree
  5) If table is selected then show table/schema/database selected
     in Object tree
  6) if root objects like database/schema is not selected and their
     children are selected then add them separately with in tables attribute
     with schema.
  */

  // Create an Object Backup of pgBrowser class
  pgBrowser.Backup = {
    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;

      // Define the nodes on which the menus to be appear
      let menus = [{
        name: 'backup_global',
        module: this,
        applies: ['tools'],
        callback: 'startBackupGlobal',
        priority: 3,
        label: gettext('Backup Globals...'),
        icon: 'fa fa-save',
        enable: menuUtils.menuEnabledServer,
        data: {
          data_disabled: gettext('Please select any server from the object explorer to take Backup of global objects.'),
        },
      }, {
        name: 'backup_server',
        module: this,
        applies: ['tools'],
        callback: 'startBackupServer',
        priority: 3,
        label: gettext('Backup Server...'),
        icon: 'fa fa-save',
        enable: menuUtils.menuEnabledServer,
        data: {
          data_disabled: gettext('Please select any server from the object explorer to take Server Backup.'),
        },
      }, {
        name: 'backup_global_ctx',
        module: this,
        node: 'server',
        applies: ['context'],
        callback: 'startBackupGlobal',
        priority: 3,
        label: gettext('Backup Globals...'),
        icon: 'fa fa-save',
        enable: menuUtils.menuEnabledServer,
        data: {
          data_disabled: gettext('Please select any database or schema or table from the object explorer to take Backup.'),
        },
      }, {
        name: 'backup_server_ctx',
        module: this,
        node: 'server',
        applies: ['context'],
        callback: 'startBackupServer',
        priority: 3,
        label: gettext('Backup Server...'),
        icon: 'fa fa-save',
        enable: menuUtils.menuEnabledServer,
        data: {
          data_disabled: gettext('Please select any server from the object explorer to take Server Backup.'),
        },
      }, {
        name: 'backup_object',
        module: this,
        applies: ['tools'],
        callback: 'backupObjects',
        priority: 3,
        label: gettext('Backup...'),
        icon: 'fa fa-save',
        enable: supportedNodes.enabled.bind(
          null, pgBrowser.tree, menuUtils.backupSupportedNodes
        ),
        data: {
          data_disabled: gettext('Please select any database or schema or table from the object explorer to take Backup.'),
        },
      }];

      for (let node_val of menuUtils.backupSupportedNodes) {
        menus.push({
          name: 'backup_' + node_val,
          node: node_val,
          module: this,
          applies: ['context'],
          callback: 'backupObjects',
          priority: 3,
          label: gettext('Backup...'),
          enable: supportedNodes.enabled.bind(
            null, pgBrowser.tree, menuUtils.backupSupportedNodes
          ),
        });
      }

      pgBrowser.add_menus(menus);
      return this;
    },
    startBackupGlobal: function(_action, treeItem) {
      let schema = this.getGlobalUISchema(treeItem);
      let typeOfDialog = 'globals';
      let extraData = this.setExtraParameters(typeOfDialog);
      this.showBackupDialog(gettext('Backup Globals'), schema, treeItem, typeOfDialog, extraData);
    },
    startBackupServer: function(_action, treeItem) {
      let schema = this.getUISchema(treeItem, 'server');
      let typeOfDialog = 'server';
      let extraData = this.setExtraParameters(typeOfDialog);
      this.showBackupDialog(gettext('Backup Server'), schema, treeItem, typeOfDialog, extraData);
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
    url_for_utility_exists(id, params){
      return url_for('backup.utility_exists', {
        'sid': id,
        'backup_obj_type': params == null ? 'objects' : 'servers',
      });
    },
    showBackupDialog: function(title, schema, item, typeOfDialog, extraData) {
      if(schema) {
        const serverIdentifier = this.retrieveServerIdentifier();
        let urlShortcut = 'backup.create_server_job';
        if (typeOfDialog === 'backup_objects') {
          urlShortcut = 'backup.create_object_job';
        }
        const urlBase = url_for(urlShortcut, {
          'sid': serverIdentifier,
        });
        let sqlHelpUrl = 'backup.html';
        let helpUrl = url_for('help.static', {
          'filename': this.getHelpFile(typeOfDialog),
        });
        pgAdmin.Browser.Events.trigger('pgadmin:utility:show', item, title ?? 'Backup', {
          schema, extraData, urlBase, sqlHelpUrl, helpUrl, saveBtnName: gettext('Backup')
        }, pgAdmin.Browser.stdW.md, pgAdmin.Browser.stdH.lg);
      }
    },
    // Callback to draw Backup Dialog for objects
    backupObjects: function(_action, treeItem) {
      let tree = pgBrowser.tree,
        i = treeItem || tree.selected(),
        data = i ? tree.itemData(i) : undefined;

      const serverInformation = retrieveAncestorOfTypeServer(pgBrowser, treeItem, gettext('Backup Error')),
        sid = serverInformation._type == 'database' ? serverInformation._pid : serverInformation._id,
        api = getApiInstance(),
        utility_exists_url = this.url_for_utility_exists(sid);

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

        let backup_obj_url = '';
        if (data._type == 'database') {
          let did = data._id;
          backup_obj_url = url_for('backup.objects', {
            'sid': sid,
            'did': did
          });
        } else if(data._type == 'schema') {
          let did = data._pid;
          let scid = data._id;
          backup_obj_url = url_for('backup.schema_objects', {
            'sid': sid,
            'did': did,
            'scid': scid
          });
        }

        const schema = this.getUISchema(treeItem,  'backup_objects', backup_obj_url);
        const typeOfDialog = 'backup_objects';
        const extraData = this.setExtraParameters(typeOfDialog);
        this.showBackupDialog(gettext(`Backup (${pgBrowser.Nodes[data._type].label}: ${data.label})`),
          schema, treeItem, typeOfDialog, extraData);
      });
    },

    getUISchema: function(treeItem, backupType, backup_obj_url) {
      let treeNodeInfo = pgBrowser.tree.getTreeNodeHierarchy(treeItem);
      const selectedNode = pgBrowser.tree.selected();
      let itemNodeData = pgBrowser.tree.findNodeByDomElement(selectedNode).getData();
      return new BackupSchema(
        ()=> getSectionSchema(),
        ()=> getTypeObjSchema(),
        ()=> getSaveOptSchema({nodeInfo: treeNodeInfo}),
        ()=> getDisabledOptionSchema({nodeInfo: treeNodeInfo}),
        ()=> getMiscellaneousSchema({nodeInfo: treeNodeInfo}),
        ()=> getExcludePatternsSchema(),
        {
          role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
          encoding: ()=>getNodeAjaxOptions('get_encodings', pgBrowser.Nodes['database'], treeNodeInfo, itemNodeData, {
            cacheNode: 'database',
            cacheLevel: 'server',
          })
        },
        treeNodeInfo,
        pgBrowser,
        backupType,
        {
          objects: () => {
            return new Promise((resolve, reject)=>{
              let api = getApiInstance();
              api({
                url: backup_obj_url,
                method: 'GET'
              }).then((response)=> {
                resolve(response.data.data);
              }).catch((err)=>{
                reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
              });
            });
          }}
      );
    },
    getGlobalUISchema: function(treeItem) {
      let treeNodeInfo = pgBrowser.tree.getTreeNodeHierarchy(treeItem);
      const selectedNode = pgBrowser.tree.selected();
      let itemNodeData = pgBrowser.tree.findNodeByDomElement(selectedNode).getData();
      return new BackupGlobalSchema(
        ()=> getMiscellaneousGlobalSchema(),
        {
          role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
        }
      );
    },
    retrieveServerIdentifier() {
      const selectedNode = pgBrowser.tree.selected();

      let node = pgBrowser.tree.findNodeByDomElement(selectedNode);
      const treeInfo = pgBrowser.tree.getTreeNodeHierarchy(node);
      return treeInfo.server._id;
    },
    setExtraParameters(typeOfDialog) {
      let extraData = {};
      const selectedNode = pgBrowser.tree.selected();
      let selectedTreeNode = pgBrowser.tree.findNodeByDomElement(selectedNode);
      const treeInfo = pgBrowser.tree.getTreeNodeHierarchy(selectedTreeNode);
      if (typeOfDialog === 'backup_objects') {

        extraData['database'] = treeInfo.database._label;

        const nodeData = selectedTreeNode.getData();
        if (nodeData._type === 'schema') {
          extraData['schemas'] = [nodeData._label];
        }

        if (nodeData._type === 'table' || nodeData._type === 'partition') {
          extraData['tables'] = [[treeInfo.schema._label, nodeData._label]];
        }
      } else if(typeOfDialog === 'server') {
        extraData['type'] = 'server';
      } else if(typeOfDialog === 'globals') {
        extraData['type'] = 'globals';
      }

      return extraData;
    },
    getHelpFile: function (dialog_type) {
      if (dialog_type == 'globals') {
        return 'backup_globals_dialog.html';
      } else if (dialog_type == 'server') {
        return 'backup_server_dialog.html';
      }
      return 'backup_dialog.html';
    }
  };
  return pgBrowser.Backup;
});
