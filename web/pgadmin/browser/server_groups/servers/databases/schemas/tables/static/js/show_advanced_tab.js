/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import * as _ from 'underscore';

function isServerGreenPlum(tableModel) {
  return !_.isUndefined(tableModel.node_info) &&
    !_.isUndefined(tableModel.node_info.server) &&
    tableModel.node_info.server.server_type === 'gpdb';
}

export function show_advanced_tab(tableModel) {
  if (isServerGreenPlum(tableModel)) {
    return false;
  }
  return true;
}
