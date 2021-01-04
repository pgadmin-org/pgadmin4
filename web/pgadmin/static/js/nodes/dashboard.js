/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {isString, isFunction} from 'sources/utils';
import pgBrowser from 'pgadmin.browser';


export function url(itemData, item, treeHierarchy) {
  let treeNode = pgBrowser.treeMenu.findNodeByDomElement(item);
  let return_url = null;

  if (treeNode) {
    treeNode.anyFamilyMember(
      (node) => {
        let nodeData = node.getData();
        let browserNode = pgBrowser.Nodes[nodeData._type];
        let dashboardURL = browserNode && browserNode.dashboard;

        if (isFunction(dashboardURL)) {
          dashboardURL = dashboardURL.apply(
            browserNode, [node, nodeData, treeHierarchy]
          );
        }
        return_url = isString(dashboardURL) ? dashboardURL : null;

        return (return_url !== null);
      });
  }

  return return_url;
}
