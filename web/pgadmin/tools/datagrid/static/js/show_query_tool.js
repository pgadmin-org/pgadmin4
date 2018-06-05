/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from '../../../../static/js/gettext';
import url_for from '../../../../static/js/url_for';
import {getTreeNodeHierarchyFromIdentifier} from '../../../../static/js/tree/pgadmin_tree_node';

function hasDatabaseInformation(parentData) {
  return parentData.database;
}

function generateUrl(parentData) {
  let url_endpoint = 'datagrid.initialize_query_tool';
  let url_params = {
    'sgid': parentData.server_group._id,
    'sid': parentData.server._id,
  };

  if (hasDatabaseInformation(parentData)) {
    url_params['did'] = parentData.database._id;
    url_endpoint = 'datagrid.initialize_query_tool_with_did';
  }

  return url_for(url_endpoint, url_params);
}

function hasServerInformations(parentData) {
  return parentData.server === undefined;
}

export function showQueryTool(datagrid, pgBrowser, alertify, url,
                              aciTreeIdentifier, panelTitle) {
  const sURL = url || '';
  const queryToolTitle = panelTitle || '';

  const currentNode = pgBrowser.treeMenu.findNodeByDomElement(aciTreeIdentifier);
  if (currentNode === undefined) {
    alertify.alert(
      gettext('Query Tool Error'),
      gettext('No object selected.')
    );
    return;
  }

  const parentData = getTreeNodeHierarchyFromIdentifier.call(
    pgBrowser, aciTreeIdentifier);

  if (hasServerInformations(parentData)) {
    return;
  }

  const baseUrl = generateUrl(parentData);

  datagrid.create_transaction(
    baseUrl, null, 'true',
    parentData.server.server_type, sURL, queryToolTitle, '', false);
}
