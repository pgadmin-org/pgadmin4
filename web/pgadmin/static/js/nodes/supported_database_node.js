/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {isValidTreeNodeData} from 'sources/tree/tree';

function checkAllowConnIfDatabaseNode(treeNodeData) {
  return (treeNodeData._type === 'database' && treeNodeData.allowConn)
    || treeNodeData._type !== 'database';
}

function ancestorWithTypeCatalog(treeNode) {
  return treeNode.anyFamilyMember((node) => {
    return node.getData()._type === 'catalog';
  });
}

export function enabled(tree, supportedNodes, treeNodeData, domTreeNode) {
  if (!isValidTreeNodeData(treeNodeData))
    return false;

  let treeNode = tree.findNodeByDomElement(domTreeNode);
  if (!treeNode) {
    return false;
  }

  return checkAllowConnIfDatabaseNode(treeNodeData) &&
    _.indexOf(supportedNodes, treeNodeData._type) !== -1 &&
    !ancestorWithTypeCatalog(treeNode);
}


