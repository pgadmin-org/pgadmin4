/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import pgWindow from 'sources/window';
import { retrieveNameSpaceName, retrieveNodeName } from './show_view_data';
import usePreferences from '../../../../preferences/static/js/store';

const pgAdmin = pgWindow.pgAdmin;

export function getDatabaseLabel(parentData) {
  return parentData.database ? parentData.database._label
    : parentData.server?.db;
}

function isServerInformationAvailable(parentData) {
  return parentData.server === undefined;
}

export function getTitle(pgAdmin, browserPref, parentData=null, isConnTitle=false, server=null, database=null, username=null, isQueryTool=true) {
  let titleTemplate = isQueryTool ? pgAdmin['qt_default_placeholder'] : pgAdmin['vw_edt_default_placeholder'];
  if (!isConnTitle) {
    if(!isQueryTool) {
      titleTemplate = browserPref['vw_edt_tab_title_placeholder'] ?? pgAdmin['qt_default_placeholder'];
    } else {
      titleTemplate = browserPref['qt_tab_title_placeholder'] ?? pgAdmin['vw_edt_default_placeholder'];
    }
  }
  return generateTitle(titleTemplate, {
    'database': database,
    'username': username,
    'server': server,
    'schema': retrieveNameSpaceName(parentData),
    'table': retrieveNodeName(parentData),
    'type': isQueryTool ? 'query_tool' : 'view_data',
  });
}

export function getPanelTitle(pgBrowser, selected_item=null, custom_title=null, parentData=null, conn_title=false, db_label=null) {
  let preferences = usePreferences.getState().getPreferencesForModule('browser');
  if(selected_item == null && parentData == null) {
    selected_item = pgBrowser.tree.selected();
  }

  if(parentData == null) {
    parentData = pgBrowser.tree.getTreeNodeHierarchy(selected_item);
    if(parentData == null) return;
    if (isServerInformationAvailable(parentData)) {
      return;
    }
  }

  if(!db_label) {
    db_label = getDatabaseLabel(parentData);
  }

  let qt_title_placeholder = '';
  if (!conn_title) {
    if (custom_title) {
      qt_title_placeholder = custom_title;
    } else {
      qt_title_placeholder = preferences['qt_tab_title_placeholder'];
    }
  } else {
    qt_title_placeholder = pgAdmin['qt_default_placeholder'];
  }

  let title_data = {
    'database': db_label,
    'username': parentData.server.user.name,
    'server': parentData.server.label,
    'type': 'query_tool',
  };

  return generateTitle(qt_title_placeholder, title_data);
}

export function getQueryToolIcon(title, isQt, isFile) {
  let panelIcon = '';
  let panelTooltip;

  if(isFile || isFile == 'true'){
    panelIcon = 'fa fa-file-alt';
    panelTooltip = gettext('File - ') + title;
  }
  else if (isQt == 'false' || !isQt) {
    panelIcon = 'pg-font-icon icon-view_data';
    panelTooltip = gettext('View/Edit Data - ') + title;
  } else {
    panelIcon = 'pg-font-icon icon-query_tool';
    panelTooltip = gettext('Query Tool - ') + title;
  }

  return [panelIcon, panelTooltip];
}

export function setQueryToolDockerTitle(docker, panelId, isQt, panelTitle, isFile) {
  let [icon, tooltip] = getQueryToolIcon(panelTitle, isQt, isFile);
  // Enable/ Disabled the rename panel option if file is open.
  // set_renamable_option(panel, is_file);
  docker.setTitle(panelId, panelTitle, icon, tooltip);
}

export function set_renamable_option(panel, is_file) {
  if(is_file || is_file == 'true') {
    panel?.renamable(false);
  } else {
    panel?.renamable(true);
  }
}

export function generateTitle(title_placeholder, title_data) {

  if(title_data.type == 'query_tool' || title_data.type == 'psql_tool') {
    title_placeholder = title_placeholder.replace('%DATABASE%', title_data.database);
    title_placeholder = title_placeholder.replace('%USERNAME%', title_data.username);
    title_placeholder = title_placeholder.replace('%SERVER%', title_data.server);
  } else if(title_data.type == 'view_data') {
    title_placeholder = title_placeholder.replace('%DATABASE%', title_data.database);
    title_placeholder = title_placeholder.replace('%USERNAME%', title_data.username);
    title_placeholder = title_placeholder.replace('%SERVER%', title_data.server);
    title_placeholder = title_placeholder.replace('%SCHEMA%', title_data.schema);
    title_placeholder = title_placeholder.replace('%TABLE%', title_data.table);
  } else if(title_data.type == 'debugger') {
    title_placeholder = title_placeholder.replace('%FUNCTION%', _.unescape(title_data.function_name));
    title_placeholder = title_placeholder.replace('%ARGS%', _.unescape(title_data.args));
    title_placeholder = title_placeholder.replace('%SCHEMA%', _.unescape(title_data.schema));
    title_placeholder = title_placeholder.replace('%DATABASE%', _.unescape(title_data.database));
  }

  return title_placeholder;
}

/*
 * This function is used refresh the db node after showing alert to the user
 */
export function refresh_db_node(message, dbNode) {
  pgAdmin.Browser.notifier.alert(gettext('Database moved/renamed'), gettext(message), ()=>{
    pgAdmin.Browser.Nodes.database.callbacks.refresh(undefined, dbNode);
  });
}
