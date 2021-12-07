/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import pgWindow from 'sources/window';
import Notify from '../../../../static/js/helpers/Notifier';

const pgAdmin = pgWindow.pgAdmin;

export function getDatabaseLabel(parentData) {
  return parentData.database ? parentData.database.label
    : parentData.server.db;
}

function isServerInformationAvailable(parentData) {
  return parentData.server === undefined;
}

export function getPanelTitle(pgBrowser, selected_item=null, custom_title=null, parentData=null, conn_title=false, db_label=null) {
  var preferences = pgBrowser.get_preferences_for_module('browser');
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

  var qt_title_placeholder = '';
  if (!conn_title) {
    if (custom_title) {
      qt_title_placeholder = custom_title;
    } else {
      qt_title_placeholder = preferences['qt_tab_title_placeholder'];
    }
  } else {
    qt_title_placeholder = pgAdmin['qt_default_placeholder'];
  }

  var title_data = {
    'database': db_label,
    'username': parentData.server.user.name,
    'server': parentData.server.label,
    'type': 'query_tool',
  };
  var title = generateTitle(qt_title_placeholder, title_data);

  return title;
}

export function setQueryToolDockerTitle(panel, is_query_tool, panel_title, is_file) {
  let panel_icon = '', panel_tooltip = '';
  // Enable/ Disabled the rename panel option if file is open.
  set_renamable_option(panel, is_file);

  if(is_file || is_file == 'true'){
    panel_tooltip = gettext('File - ') + panel_title;
    panel_icon = 'fa fa-file-alt';
  }
  else if (is_query_tool == 'false' || is_query_tool == false) {
    // Edit grid titles
    panel_tooltip = gettext('View/Edit Data - ') + panel_title;
    panel_icon = 'pg-font-icon icon-view_data';
  } else {
    // Query tool titles
    panel_tooltip = gettext('Query Tool - ') + panel_title;
    panel_icon = 'pg-font-icon icon-query_tool';
  }

  panel.title('<span title="'+ _.escape(panel_tooltip) +'">'+ _.escape(panel_title) +'</span>');
  panel.icon(panel_icon);

}

export function set_renamable_option(panel, is_file) {
  if(is_file || is_file == 'true') {
    panel.renamable(false);
  } else {
    panel.renamable(true);
  }
}

export function generateTitle(title_placeholder, title_data) {

  if(title_data.type == 'query_tool') {
    title_placeholder = title_placeholder.replace(new RegExp('%DATABASE%'), _.unescape(title_data.database));
    title_placeholder = title_placeholder.replace(new RegExp('%USERNAME%'), _.unescape(title_data.username));
    title_placeholder = title_placeholder.replace(new RegExp('%SERVER%'), _.unescape(title_data.server));
  } else if(title_data.type == 'datagrid') {
    title_placeholder = title_placeholder.replace(new RegExp('%DATABASE%'), _.unescape(title_data.database));
    title_placeholder = title_placeholder.replace(new RegExp('%USERNAME%'), _.unescape(title_data.username));
    title_placeholder = title_placeholder.replace(new RegExp('%SERVER%'), _.unescape(title_data.server));
    title_placeholder = title_placeholder.replace(new RegExp('%SCHEMA%'), _.unescape(title_data.schema));
    title_placeholder = title_placeholder.replace(new RegExp('%TABLE%'), _.unescape(title_data.table));
  } else if(title_data.type == 'debugger') {
    title_placeholder = title_placeholder.replace(new RegExp('%FUNCTION%'), _.unescape(title_data.function_name));
    title_placeholder = title_placeholder.replace(new RegExp('%ARGS%'), _.unescape(title_data.args));
    title_placeholder = title_placeholder.replace(new RegExp('%SCHEMA%'), _.unescape(title_data.schema));
    title_placeholder = title_placeholder.replace(new RegExp('%DATABASE%'), _.unescape(title_data.database));
  } else if(title_data.type == 'psql_tool') {
    title_placeholder = title_placeholder.replace(new RegExp('%DATABASE%'), _.unescape(title_data.database));
    title_placeholder = title_placeholder.replace(new RegExp('%USERNAME%'), _.unescape(title_data.username));
    title_placeholder = title_placeholder.replace(new RegExp('%SERVER%'), _.unescape(title_data.server));
  }

  return _.escape(title_placeholder);
}

/*
 * This function is used refresh the db node after showing alert to the user
 */
export function refresh_db_node(message, dbNode) {
  Notify.alert()
    .setting({
      'title': gettext('Database moved/renamed'),
      'label':gettext('OK'),
      'message': gettext(message),
      'onok': function(){
        //Set the original db name as soon as user clicks ok button
        pgAdmin.Browser.Nodes.database.callbacks.refresh(undefined, dbNode);
      },
    }).show();
}
