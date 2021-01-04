/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {calculateQueryRunTime} from './calculate_query_run_time';
import gettext from '../gettext';

function hasResultsToDisplay(res) {
  return res.colinfo != null;
}

function isQueryTool(sqlEditor) {
  return sqlEditor.is_query_tool;
}

function isNotificationEnabled(sqlEditor) {
  return sqlEditor.info_notifier_timeout >= 0;
}

export function callRenderAfterPoll(sqlEditor, alertify, res) {
  sqlEditor.query_end_time = new Date();
  sqlEditor.rows_affected = res.rows_affected;
  sqlEditor.has_more_rows = res.has_more_rows;

  if (hasResultsToDisplay(res)) {
    sqlEditor._render(res);
  } else {
    sqlEditor.total_time = calculateQueryRunTime(
      sqlEditor.query_start_time,
      sqlEditor.query_end_time);
    const msg = gettext('Query returned successfully in %s.', sqlEditor.total_time);
    if (res.result)
      res.result += '\n\n' + msg;
    else
      res.result = msg;
    sqlEditor.update_msg_history(true, res.result, false);
    sqlEditor.reset_data_store();
    if (isNotificationEnabled(sqlEditor)) {
      alertify.success(msg, sqlEditor.info_notifier_timeout);
    }
    sqlEditor.enable_disable_download_btn(true);
  }

  if (isQueryTool(sqlEditor)) {
    sqlEditor.disable_tool_buttons(false);
  }

  sqlEditor.setIsQueryRunning(false);
  sqlEditor.trigger('pgadmin-sqleditor:loading-icon:hide');
}
