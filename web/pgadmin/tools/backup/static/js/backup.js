/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import {getUtilityView, removeNodeView} from '../../../../browser/static/js/utility_view';
import { getNodeListByName, getNodeAjaxOptions } from '../../../../browser/static/js/node_ajax';
import BackupSchema, {getSectionSchema, getTypeObjSchema, getSaveOptSchema, getQueryOptionSchema, getDisabledOptionSchema, getMiscellaneousSchema} from './backup.ui';
import BackupGlobalSchema, {getMiscellaneousSchema as getMiscellaneousGlobalSchema} from './backupGlobal.ui';
import Notify from '../../../../static/js/helpers/Notifier';

// Backup dialog
define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'sources/pgadmin',
  'backbone', 'pgadmin.backgrid',
  'pgadmin.backform', 'pgadmin.browser', 'sources/utils',
  'tools/backup/static/js/menu_utils',
  'sources/nodes/supported_database_node',
], function(
  gettext, url_for, $, _, pgAdmin, Backbone, Backgrid, Backform, pgBrowser,
  commonUtils, menuUtils, supportedNodes
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
      var menus = [{
        name: 'backup_global',
        module: this,
        applies: ['tools'],
        callback: 'startBackupGlobal',
        priority: 12,
        label: gettext('Backup Globals...'),
        icon: 'fa fa-save',
        enable: menuUtils.menuEnabledServer,
        data: {
          data_disabled: gettext('Please select any server from the browser tree to take Backup of global objects.'),
        },
      }, {
        name: 'backup_server',
        module: this,
        applies: ['tools'],
        callback: 'startBackupServer',
        priority: 12,
        label: gettext('Backup Server...'),
        icon: 'fa fa-save',
        enable: menuUtils.menuEnabledServer,
        data: {
          data_disabled: gettext('Please select any server from the browser tree to take Server Backup.'),
        },
      }, {
        name: 'backup_global_ctx',
        module: this,
        node: 'server',
        applies: ['context'],
        callback: 'startBackupGlobal',
        priority: 12,
        label: gettext('Backup Globals...'),
        icon: 'fa fa-save',
        enable: menuUtils.menuEnabledServer,
        data: {
          data_disabled: gettext('Please select any database or schema or table from the browser tree to take Backup.'),
        },
      }, {
        name: 'backup_server_ctx',
        module: this,
        node: 'server',
        applies: ['context'],
        callback: 'startBackupServer',
        priority: 12,
        label: gettext('Backup Server...'),
        icon: 'fa fa-save',
        enable: menuUtils.menuEnabledServer,
        data: {
          data_disabled: gettext('Please select any server from the browser tree to take Server Backup.'),
        },
      }, {
        name: 'backup_object',
        module: this,
        applies: ['tools'],
        callback: 'backupObjects',
        priority: 11,
        label: gettext('Backup...'),
        icon: 'fa fa-save',
        enable: supportedNodes.enabled.bind(
          null, pgBrowser.tree, menuUtils.backupSupportedNodes
        ),
        data: {
          data_disabled: gettext('Please select any database or schema or table from the browser tree to take Backup.'),
        },
      }];

      for (var idx = 0; idx < menuUtils.backupSupportedNodes.length; idx++) {
        menus.push({
          name: 'backup_' + menuUtils.backupSupportedNodes[idx],
          node: menuUtils.backupSupportedNodes[idx],
          module: this,
          applies: ['context'],
          callback: 'backupObjects',
          priority: 11,
          label: gettext('Backup...'),
          icon: 'fa fa-save',
          enable: supportedNodes.enabled.bind(
            null, pgBrowser.tree, menuUtils.backupSupportedNodes
          ),
        });
      }

      pgBrowser.add_menus(menus);
      return this;
    },
    startBackupGlobal: function(action, treeItem) {
      pgBrowser.Node.registerUtilityPanel();
      var panel = pgBrowser.Node.addUtilityPanel();
      var tree = pgBrowser.tree,
        i = treeItem || tree.selected(),
        data = i ? tree.itemData(i) : undefined,
        j = panel.$container.find('.obj_properties').first();

      var schema = this.getGlobalUISchema(treeItem);
      panel.title('Backup Globals');
      panel.focus();
      var typeOfDialog = 'globals';
      var serverIdentifier = this.retrieveServerIdentifier();

      var extraData = this.setExtraParameters(typeOfDialog);
      this.showBackupDialog(schema, treeItem, j, data, panel, typeOfDialog, serverIdentifier, extraData);
    },
    startBackupServer: function(action, treeItem) {
      pgBrowser.Node.registerUtilityPanel();
      var panel = pgBrowser.Node.addUtilityPanel();
      var tree = pgBrowser.tree,
        i = treeItem || tree.selected(),
        data = i ? tree.itemData(i) : undefined,
        j = panel.$container.find('.obj_properties').first();

      var schema = this.getUISchema(treeItem, 'server');
      panel.title(gettext('Backup Server'));
      panel.focus();
      var typeOfDialog = 'server';
      var serverIdentifier = this.retrieveServerIdentifier();

      var extraData = this.setExtraParameters(typeOfDialog);
      this.showBackupDialog(schema, treeItem, j, data, panel, typeOfDialog, serverIdentifier, extraData);
    },
    saveCallBack: function(data, dialog) {
      if(data.errormsg) {
        Notify.alert(
          gettext('Utility not found'),
          gettext(data.errormsg)
        );
      } else {
        pgBrowser.Events.trigger('pgadmin-bgprocess:created', dialog);
      }
    },
    showBackupDialog: function(schema, item, j, data, panel, typeOfDialog, serverIdentifier, extraData) {
      if(schema) {
        let treeNodeInfo = pgBrowser.tree.getTreeNodeHierarchy(item);
        removeNodeView(j[0]);

        let urlShortcut = 'backup.create_server_job';
        if (typeOfDialog === 'backup_objects') {
          urlShortcut = 'backup.create_object_job';
        }
        const baseUrl = url_for(urlShortcut, {
          'sid': serverIdentifier,
        });
        var sqlHelpUrl = 'backup.html';
        var helpUrl = url_for('help.static', {
          'filename': this.getHelpFile(typeOfDialog),
        });
        getUtilityView(
          schema, treeNodeInfo, 'create', 'dialog', j[0], panel, this.saveCallBack, extraData, 'Backup', baseUrl, sqlHelpUrl, helpUrl);
      }
    },
    // Callback to draw Backup Dialog for objects
    backupObjects: function(action, treeItem) {
      pgBrowser.Node.registerUtilityPanel();
      var panel = pgBrowser.Node.addUtilityPanel();
      var tree = pgBrowser.tree,
        i = treeItem || tree.selected(),
        data = i ? tree.itemData(i) : undefined,
        j = panel.$container.find('.obj_properties').first();

      var schema = this.getUISchema(treeItem,  'backup_objects');
      panel.title(`Backup (${pgBrowser.Nodes[data._type].label}: ${data.label})`);
      panel.focus();

      var typeOfDialog = 'backup_objects';
      var serverIdentifier = this.retrieveServerIdentifier();

      var extraData = this.setExtraParameters(typeOfDialog);
      this.showBackupDialog(schema, treeItem, j, data, panel, typeOfDialog, serverIdentifier, extraData);

    },
    getUISchema: function(treeItem, backupType) {
      let treeNodeInfo = pgBrowser.tree.getTreeNodeHierarchy(treeItem);
      const selectedNode = pgBrowser.tree.selected();
      let itemNodeData = pgBrowser.tree.findNodeByDomElement(selectedNode).getData();
      return new BackupSchema(
        ()=> getSectionSchema(),
        ()=> getTypeObjSchema({backupType: backupType}),
        ()=> getSaveOptSchema({nodeInfo: treeNodeInfo}),
        ()=> getQueryOptionSchema({nodeInfo: treeNodeInfo, backupType: backupType}),
        ()=> getDisabledOptionSchema({nodeInfo: treeNodeInfo}),
        ()=> getMiscellaneousSchema({nodeInfo: treeNodeInfo}),
        {
          role: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
          encoding: ()=>getNodeAjaxOptions('get_encodings', pgBrowser.Nodes['database'], treeNodeInfo, itemNodeData, {
            cacheNode: 'database',
            cacheLevel: 'server',
          }),
        },
        treeNodeInfo,
        pgBrowser,
        backupType
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

      var node = pgBrowser.tree.findNodeByDomElement(selectedNode);
      const treeInfo = pgBrowser.tree.getTreeNodeHierarchy(node);
      return treeInfo.server._id;
    },
    setExtraParameters(typeOfDialog) {
      var extraData = {};
      const selectedNode = pgBrowser.tree.selected();
      var selectedTreeNode = pgBrowser.tree.findNodeByDomElement(selectedNode);
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

        /*(if (_.isEmpty(this.view.model.get('ratio'))) {
          this.view.model.unset('ratio');
        }*/
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
