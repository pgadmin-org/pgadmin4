//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

export function nodeHasStatistics(pgBrowser, node, item) {
  if(typeof(node.hasStatistics) === 'function') {
    const treeHierarchy = pgBrowser.tree.getTreeNodeHierarchy(item);
    return node.hasStatistics(treeHierarchy);
  }
  return node.hasStatistics;
}
