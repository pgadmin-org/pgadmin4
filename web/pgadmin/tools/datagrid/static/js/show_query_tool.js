/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from '../../../../static/js/gettext';
import url_for from '../../../../static/js/url_for';
import {getTreeNodeHierarchyFromIdentifier} from '../../../../static/js/tree/pgadmin_tree_node';
import {getPanelTitle} from './datagrid_panel_title';
import {getRandomInt} from 'sources/utils';

function hasDatabaseInformation(parentData) {
  return parentData.database;
}

function generateUrl(trans_id, title, parentData) {
  let url_endpoint = url_for('datagrid.panel', {
    'trans_id': trans_id,
  });

  url_endpoint += `?is_query_tool=${true}`
    +`&sgid=${parentData.server_group._id}`
    +`&sid=${parentData.server._id}`
    +`&server_type=${parentData.server.server_type}`;

  if (hasDatabaseInformation(parentData)) {
    url_endpoint += `&did=${parentData.database._id}`;
  }

  return url_endpoint;
}

function hasServerInformations(parentData) {
  return parentData.server === undefined;
}

function generateTitle(pgBrowser, aciTreeIdentifier) {
  const baseTitle = getPanelTitle(pgBrowser, aciTreeIdentifier);
  return baseTitle;
}

export function showQueryTool(datagrid, pgBrowser, alertify, url, aciTreeIdentifier, transId) {
  const sURL = url || '';
  const queryToolTitle = generateTitle(pgBrowser, aciTreeIdentifier);

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

  const gridUrl = generateUrl(transId, queryToolTitle, parentData);

  datagrid.launch_grid(transId, gridUrl, true, queryToolTitle, sURL);
}

export function generateScript(parentData, datagrid) {
  const queryToolTitle = `${parentData.database}/${parentData.user}@${parentData.server}`;
  const transId = getRandomInt(1, 9999999);

  let url_endpoint = url_for('datagrid.panel', {
    'trans_id': transId,
  });

  url_endpoint += `?is_query_tool=${true}`
    +`&sgid=${parentData.sgid}`
    +`&sid=${parentData.sid}`
    +`&server_type=${parentData.stype}`
    +`&did=${parentData.did}`;

  datagrid.launch_grid(transId, url_endpoint, true, queryToolTitle, '');

}
