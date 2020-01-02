//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

/**
 * This method received pgBrowser and new TreeNode object
 *
 * This method retrieves all the data that exists in the tree node and in
 * `pgBrowser.Nodes` for all the parent node of the provided node.
 *
 * The 2 condition to get the information from pgBrowser.Nodes are:
 *  1 - the variable _type of the tree node
 *  2 - the presence of hasId in the pgBrowser.Nodes for the specific node
 *
 * Number 2 is used to ignore coll-* nodes as they do not add any useful
 * information
 */
export function getTreeNodeHierarchyFromElement(pgBrowser, treeNode) {
  return getTreeNodeHierarchy.call(pgBrowser, treeNode);
}

/**
 * This method received an ACI Tree JQuery node
 *
 * NOTE: this function need to be called on pgBrowser instance.
 * getTreeNodeHierarchyFromIdentifier.apply(pgBrowser, [aciTreeNodeIdentifier])
 *
 * This method retrieves all the data that exists in the tree node and in
 * `pgBrowser.Nodes` for all the parent node of the provided node.
 *
 * The 2 condition to get the information from pgBrowser.Nodes are:
 *  1 - the variable _type of the tree node
 *  2 - the presence of hasId in the pgBrowser.Nodes for the specific node
 *
 * Number 2 is used to ignore coll-* nodes as they do not add any useful
 * information
 */
export function getTreeNodeHierarchyFromIdentifier(aciTreeNodeIdentifier) {
  let identifier = this.treeMenu.translateTreeNodeIdFromACITree(aciTreeNodeIdentifier);
  let currentNode = this.treeMenu.findNode(identifier);
  if (currentNode === null) return null;
  return getTreeNodeHierarchy.call(this, currentNode);
}

export function getTreeNodeHierarchy(currentNode) {
  let idx = 0;
  let node_cnt = 0;
  let result = {};

  do {
    const currentNodeData = currentNode.getData();
    if (currentNodeData._type in this.Nodes && this.Nodes[currentNodeData._type].hasId) {
      const nodeType = mapType(currentNodeData._type, node_cnt);
      if (result[nodeType] === undefined) {
        result[nodeType] = _.extend({}, currentNodeData, {
          'priority': idx,
        });
        idx -= 1;
      }
    }
    node_cnt += 1;
    currentNode = currentNode.hasParent() ? currentNode.parent() : null;
  } while (currentNode);

  return result;
}

function mapType(type, idx) {
  return (type === 'partition' && idx > 0) ? 'table' : type;
}
