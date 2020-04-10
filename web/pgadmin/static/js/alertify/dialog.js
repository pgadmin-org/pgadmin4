/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from '../gettext';
import {DialogFactory} from './dialog_factory';
import Backform from '../backform.pgadmin';
import {getTreeNodeHierarchyFromIdentifier} from '../tree/pgadmin_tree_node';

/**
 * This class can be extended to create new dialog boxes.
 * Examples of this can be found in:
 * `web/pgadmin/static/js/backup/backup_dialog.js`
 *
 * Do not forget to add the new Dialog type to the `DialogFactory`
 */
export class Dialog {
  constructor(errorAlertTitle,
    dialogContainerSelector,
    pgBrowser, $, alertify, DialogModel,
    backform = Backform) {
    this.errorAlertTitle = errorAlertTitle;
    this.alertify = alertify;
    this.pgBrowser = pgBrowser;
    this.jquery = $;
    this.dialogModel = DialogModel;
    this.backform = backform;
    this.dialogContainerSelector = dialogContainerSelector;
  }

  retrieveAncestorOfTypeServer(item) {
    let serverInformation = null;
    let aciTreeItem = item || this.pgBrowser.treeMenu.selected();
    let treeNode = this.pgBrowser.treeMenu.findNodeByDomElement(aciTreeItem);

    if (treeNode) {
      let nodeData;
      let databaseNode = treeNode.ancestorNode(
        (node) => {
          nodeData = node.getData();
          return (nodeData._type === 'database');
        }
      );
      let isServerNode = (node) => {
        nodeData = node.getData();
        return nodeData._type === 'server';
      };

      if (databaseNode !== null) {
        if (nodeData._label.indexOf('=') >= 0) {
          this.alertify.alert(
            gettext(this.errorAlertTitle),
            gettext(
              'Databases with = symbols in the name cannot be backed up or restored using this utility.'
            )
          );
        } else {
          if (databaseNode.anyParent(isServerNode))
            serverInformation = nodeData;
        }
      } else {
        if (treeNode.anyFamilyMember(isServerNode))
          serverInformation = nodeData;
      }
    }

    if (serverInformation === null) {
      this.alertify.alert(
        gettext(this.errorAlertTitle),
        gettext('Please select server or child node from the browser tree.')
      );
    }

    return serverInformation;
  }

  retrieveAncestorOfTypeDatabase(item) {
    let databaseInfo = null;
    let aciTreeItem = item || this.pgBrowser.treeMenu.selected();
    let treeNode = this.pgBrowser.treeMenu.findNodeByDomElement(aciTreeItem);

    if (treeNode) {
      if(treeNode.getData()._type === 'database') {
        databaseInfo = treeNode.getData();
      } else {
        let nodeData = null;
        treeNode.ancestorNode(
          (node) => {
            nodeData = node.getData();
            if(nodeData._type === 'database') {
              databaseInfo = nodeData;
              return true;
            }
            return false;
          }
        );
      }
    }

    if (databaseInfo === null) {
      this.alertify.alert(
        gettext(this.errorAlertTitle),
        gettext('Please select a database or its child node from the browser.')
      );
    }

    return databaseInfo;
  }

  hasBinariesConfiguration(serverInformation) {
    const module = 'paths';
    let preference_name = 'pg_bin_dir';
    let msg = gettext('Please configure the PostgreSQL Binary Path in the Preferences dialog.');

    if ((serverInformation.type && serverInformation.type === 'ppas') ||
      serverInformation.server_type === 'ppas') {
      preference_name = 'ppas_bin_dir';
      msg = gettext('Please configure the EDB Advanced Server Binary Path in the Preferences dialog.');
    }
    const preference = this.pgBrowser.get_preference(module, preference_name);

    if (preference) {
      if (!preference.value) {
        this.alertify.alert(gettext('Configuration required'), msg);
        return false;
      }
    } else {
      this.alertify.alert(
        gettext(this.errorAlertTitle),
        gettext('Failed to load preference %s of module %s', preference_name, module)
      );
      return false;
    }
    return true;
  }

  dialogName() {
    return undefined;
  }

  createOrGetDialog(dialogTitle, typeOfDialog) {
    const dialogName = this.dialogName(typeOfDialog);

    if (!this.alertify[dialogName]) {
      const self = this;
      this.alertify.dialog(dialogName, function factory() {
        return self.dialogFactory(dialogTitle, typeOfDialog);
      });
    }
    return this.alertify[dialogName];
  }

  dialogFactory(dialogTitle, typeOfDialog) {
    const factory = new DialogFactory(
      this.pgBrowser,
      this.jquery,
      this.alertify,
      this.dialogModel,
      this.backform,
      this.dialogContainerSelector);
    return factory.create(dialogTitle, typeOfDialog);
  }

  canExecuteOnCurrentDatabase(aciTreeItem) {
    const treeInfo = getTreeNodeHierarchyFromIdentifier.apply(this.pgBrowser, [aciTreeItem]);

    if (treeInfo.database && treeInfo.database._label.indexOf('=') >= 0) {
      this.alertify.alert(
        gettext(this.errorAlertTitle),
        gettext('Databases with = symbols in the name cannot be backed up or restored using this utility.')
      );
      return false;
    }

    return true;
  }
}
