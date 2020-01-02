//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

export function nodeHasStatistics(node, item) {
  if(typeof(node.hasStatistics) === 'function') {
    const treeHierarchy = node.getTreeNodeHierarchy(item);
    return node.hasStatistics(treeHierarchy);
  }
  return node.hasStatistics;
}
