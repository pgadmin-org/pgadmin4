/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import {getPanelTitle} from './sqleditor_title';
import {getRandomInt} from 'sources/utils';
import pgAdmin from 'sources/pgadmin';

function hasDatabaseInformation(parentData) {
  return parentData.database;
}

export function generateUrl(trans_id, parentData, sqlId) {
  let url_endpoint = url_for('sqleditor.panel', {
    'trans_id': trans_id,
  });

  url_endpoint += `?is_query_tool=${true}`
    +`&sgid=${parentData.server_group._id}`
    +`&sid=${parentData.server._id}`;

  if (hasDatabaseInformation(parentData)) {
    url_endpoint += `&did=${parentData.database._id}`;
    if(parentData.database._label) {
      url_endpoint += `&database_name=${encodeURIComponent(parentData.database._label)}`;
    }
    if(!parentData.server.username && parentData.server.user?.name) {
      url_endpoint += `&user=${encodeURIComponent(parentData.server.user?.name)}`;
    }
  }

  if(sqlId) {
    url_endpoint += `&sql_id=${sqlId}`;
  }

  return url_endpoint;
}

function hasServerInformations(parentData) {
  return parentData.server === undefined;
}

function generateTitle(pgBrowser, treeIdentifier) {
  return getPanelTitle(pgBrowser, treeIdentifier);
}

export function showQueryTool(queryToolMod, pgBrowser, url, treeIdentifier, transId) {
  const queryToolTitle = generateTitle(pgBrowser, treeIdentifier);

  const currentNode = pgBrowser.tree.findNodeByDomElement(treeIdentifier);
  if (currentNode === undefined) {
    pgAdmin.Browser.notifier.alert(
      gettext('Query Tool Error'),
      gettext('No object selected.')
    );
    return;
  }

  const parentData = pgBrowser.tree.getTreeNodeHierarchy(currentNode);

  if (hasServerInformations(parentData)) {
    return;
  }

  const gridUrl = generateUrl(transId, parentData);
  launchQueryTool(queryToolMod, transId, gridUrl, queryToolTitle, {query_url: url});
}

export function generateScript(parentData, queryToolMod) {
  const queryToolTitle = `${parentData.database}/${parentData.user}@${parentData.server}`;
  const transId = getRandomInt(1, 9999999);

  let url_endpoint = url_for('sqleditor.panel', {
    'trans_id': transId,
  });

  url_endpoint += `?is_query_tool=${true}`
    +`&sgid=${parentData.sgid}`
    +`&sid=${parentData.sid}`
    +`&server_type=${parentData.stype}`
    +`&did=${parentData.did}`
    +`&database_name=${parentData.database}`
    +`&sql_id=${parentData.sql_id}`;

  launchQueryTool(queryToolMod, transId, url_endpoint, queryToolTitle, '');
}

export function showERDSqlTool(parentData, erdSqlId, queryToolTitle, queryToolMod) {
  const transId = getRandomInt(1, 9999999);
  parentData = {
    server_group: {
      _id: parentData.sgid,
    },
    server: {
      _id: parentData.sid,
      server_type: parentData.stype,
    },
    database: {
      _id: parentData.did,
      label: parentData.database,
    },
  };

  const gridUrl = generateUrl(transId, parentData, erdSqlId);
  launchQueryTool(queryToolMod, transId, gridUrl, queryToolTitle, {});
}

export function launchQueryTool(queryToolMod, transId, gridUrl, queryToolTitle, params) {
  let retVal = queryToolMod.launch(transId, gridUrl, true, queryToolTitle, params);

  if(!retVal) {
    pgAdmin.Browser.notifier.alert(
      gettext('Query tool launch error'),
      gettext(
        'Please allow pop-ups for this site to perform the desired action. If the main window of pgAdmin is closed then close this window and open a new pgAdmin session.'
      )
    );
  }
}
