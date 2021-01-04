/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {isValidTreeNodeData} from '../../../../static/js/tree/tree';

export const backupSupportedNodes = [
  'database', 'schema', 'table', 'partition',
];

function isNodeAServerAndConnected(treeNodeData) {
  return (('server' === treeNodeData._type) && treeNodeData.connected);
}

export function menuEnabledServer(treeNodeData) {
  return isValidTreeNodeData(treeNodeData)
    && isNodeAServerAndConnected(treeNodeData);
}
