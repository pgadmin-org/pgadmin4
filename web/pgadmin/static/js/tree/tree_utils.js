//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import Notify from '../helpers/Notifier';

export function retrieveAncestorOfTypeServer(pgBrowser, item, errorAlertTitle) {
  let serverInformation = null;
  let treeItem = item || pgBrowser.tree.selected();
  let treeNode = pgBrowser.tree.findNodeByDomElement(treeItem);

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
        Notify.alert(
          gettext(errorAlertTitle),
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
    Notify.alert(
      gettext(errorAlertTitle),
      gettext('Please select server or child node from the browser tree.')
    );
  }

  return serverInformation;
}

export function retrieveAncestorOfTypeDatabase(pgBrowser, item, errorAlertTitle) {
  let databaseInfo = null;
  let treeItem = item || pgBrowser.tree.selected();
  let treeNode = pgBrowser.tree.findNodeByDomElement(treeItem);
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
    Notify.alert(
      gettext(errorAlertTitle),
      gettext('Please select a database or its child node from the browser.')
    );
  }

  return databaseInfo;
}
