/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {getTreeNodeHierarchyFromIdentifier} from '../../../../static/js/tree/pgadmin_tree_node';

function getDatabaseLabel(parentData) {
  return parentData.database ? parentData.database.label
    : parentData.server.db;
}

function isServerInformationAvailable(parentData) {
  return parentData.server === undefined;
}

export function getPanelTitle(pgBrowser) {
  const selected_item = pgBrowser.treeMenu.selected();

  const parentData = getTreeNodeHierarchyFromIdentifier
    .call(pgBrowser, selected_item);
  if (isServerInformationAvailable(parentData)) {
    return;
  }

  const db_label = getDatabaseLabel(parentData);

  return `${db_label} on ${parentData.server.user.name}@${parentData.server.label}`;
}
