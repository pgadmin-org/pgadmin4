import {shortcut_key, shortcut_accesskey_title, shortcut_title}
  from 'sources/keyboard_shortcuts';
import * as SqlEditorUtils from 'sources/sqleditor_utils';
import $ from 'jquery';

function updateUIPreferences(sqlEditor) {
  let $el = sqlEditor.$el,
    preferences = sqlEditor.preferences;

  if(sqlEditor.handler.slickgrid) {
    sqlEditor.handler.slickgrid.CSVOptions = {
      quoting: sqlEditor.preferences.results_grid_quoting,
      quote_char: sqlEditor.preferences.results_grid_quote_char,
      field_separator: sqlEditor.preferences.results_grid_field_separator,
    };
  }

  /* Accessed using accesskey direct w/o ctrl,atl,shift */
  $el.find('#btn-load-file')
    .attr('title', shortcut_accesskey_title('Open File',preferences.btn_open_file))
    .attr('accesskey', shortcut_key(preferences.btn_open_file));

  $el.find('#btn-save')
    .attr('title', shortcut_accesskey_title('Save File',preferences.btn_save_file))
    .attr('accesskey', shortcut_key(preferences.btn_save_file));

  $el.find('#btn-find-menu-dropdown')
    .attr('title', shortcut_accesskey_title('Find',preferences.btn_find_options))
    .attr('accesskey', shortcut_key(preferences.btn_find_options));

  $el.find('#btn-copy-row')
    .attr('title', shortcut_accesskey_title('Copy',preferences.btn_copy_row))
    .attr('accesskey', shortcut_key(preferences.btn_copy_row));

  $el.find('#btn-paste-row')
    .attr('title', shortcut_accesskey_title('Paste',preferences.btn_paste_row))
    .attr('accesskey', shortcut_key(preferences.btn_paste_row));

  $el.find('#btn-delete-row')
    .attr('title', shortcut_accesskey_title('Delete',preferences.btn_delete_row))
    .attr('accesskey', shortcut_key(preferences.btn_delete_row));

  $el.find('#btn-filter')
    .attr('title', shortcut_accesskey_title('Filter',preferences.btn_filter_dialog))
    .attr('accesskey', shortcut_key(preferences.btn_filter_dialog));

  $el.find('#btn-filter-dropdown')
    .attr('title', shortcut_accesskey_title('Filter options',preferences.btn_filter_options))
    .attr('accesskey', shortcut_key(preferences.btn_filter_options));

  $el.find('#btn-rows-limit')
    .attr('title', shortcut_accesskey_title('Rows limit',preferences.btn_rows_limit))
    .attr('accesskey', shortcut_key(preferences.btn_rows_limit));

  $el.find('#btn-query-dropdown')
    .attr('title', shortcut_accesskey_title('Execute options',preferences.btn_execute_options))
    .attr('accesskey', shortcut_key(preferences.btn_execute_options));

  $el.find('#btn-cancel-query')
    .attr('title', shortcut_accesskey_title('Cancel query',preferences.btn_cancel_query))
    .attr('accesskey', shortcut_key(preferences.btn_cancel_query));

  $el.find('#btn-clear-dropdown')
    .attr('title', shortcut_accesskey_title('Clear',preferences.btn_clear_options))
    .attr('accesskey', shortcut_key(preferences.btn_clear_options));

  $el.find('#btn-conn-status')
    .attr('accesskey', shortcut_key(preferences.btn_conn_status))
    .find('i')
    .attr('title',
      shortcut_accesskey_title('Connection status (click for details)',
                            preferences.btn_conn_status));

  /* Accessed using ctrl,atl,shift and key */
  $el.find('#btn-flash')
    .attr('title',
      shortcut_title('Execute/Refresh',preferences.execute_query));

  $el.find('#btn-flash-menu span')
    .text(shortcut_title('Execute/Refresh',preferences.execute_query));

  $el.find('#btn-explain span')
    .text(shortcut_title('Explain',preferences.explain_query));

  $el.find('#btn-explain-analyze span')
    .text(shortcut_title('Explain Analyze',preferences.explain_analyze_query));

  $el.find('#btn-download')
    .attr('title',
      shortcut_title('Download as CSV',preferences.download_csv));

  /* Set Auto-commit and auto-rollback on query editor */
  if (preferences.auto_commit) {
    $el.find('.auto-commit').removeClass('visibility-hidden');
  }
  else {
    $el.find('.auto-commit').addClass('visibility-hidden');
  }
  if (preferences.auto_rollback) {
    $el.find('.auto-rollback').removeClass('visibility-hidden');
  }
  else {
    $el.find('.auto-rollback').addClass('visibility-hidden');
  }

  /* Set explain options on query editor */
  if (preferences.explain_verbose){
    $el.find('.explain-verbose').removeClass('visibility-hidden');
  }
  else {
    $el.find('.explain-verbose').addClass('visibility-hidden');
  }

  if (preferences.explain_costs){
    $el.find('.explain-costs').removeClass('visibility-hidden');
  }
  else {
    $el.find('.explain-costs').addClass('visibility-hidden');
  }

  if (preferences.explain_buffers){
    $el.find('.explain-buffers').removeClass('visibility-hidden');
  }
  else {
    $el.find('.explain-buffers').addClass('visibility-hidden');
  }

  if (preferences.explain_timing) {
    $el.find('.explain-timing').removeClass('visibility-hidden');
  }
  else {
    $el.find('.explain-timing').addClass('visibility-hidden');
  }

  /* Connection status check */
  /* remove the status checker if present */
  if(sqlEditor.connIntervalId != null) {
    clearInterval(sqlEditor.connIntervalId);
    sqlEditor.connIntervalId = null;
  }
  if (preferences.connection_status) {
    let $conn_status = $el.find('#btn-conn-status'),
      $status_el = $conn_status.find('i');
    $conn_status.popover();

    $conn_status.removeClass('connection-status-hide');
    $el.find('.editor-title').addClass('editor-title-connection');

    // To set initial connection
    SqlEditorUtils.fetchConnectionStatus(sqlEditor.handler, $conn_status, $status_el);

    // Calling it again in specified interval
    sqlEditor.connIntervalId =  setInterval(
        SqlEditorUtils.fetchConnectionStatus.bind(null, sqlEditor.handler, $conn_status, $status_el),
        preferences.connection_status_fetch_time * 1000
    );
  }
  else {
    $el.find('#btn-conn-status').addClass('connection-status-hide');
    $el.find('.editor-title').removeClass('editor-title-connection');
  }

  /* Code Mirror Preferences */
  let sql_font_size = SqlEditorUtils.calcFontSize(preferences.sql_font_size);
  $(sqlEditor.query_tool_obj.getWrapperElement()).css('font-size', sql_font_size);

  sqlEditor.query_tool_obj.setOption('indentWithTabs', !preferences.use_spaces);
  sqlEditor.query_tool_obj.setOption('indentUnit', preferences.tab_size);
  sqlEditor.query_tool_obj.setOption('tabSize', preferences.tab_size);
  sqlEditor.query_tool_obj.setOption('lineWrapping', preferences.wrap_code);
  sqlEditor.query_tool_obj.setOption('autoCloseBrackets', preferences.insert_pair_brackets);
  sqlEditor.query_tool_obj.setOption('matchBrackets', preferences.brace_matching);
  sqlEditor.query_tool_obj.refresh();

  /* Render history to reflect Font size change */
  sqlEditor.render_history_grid();
}

export {updateUIPreferences};
