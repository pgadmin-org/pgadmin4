/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
import pgWindow from 'sources/window';

let queryToolActions = {
  _verbose: function () {
    return !$('.explain-verbose').hasClass('visibility-hidden');
  },

  _costsEnabled: function () {
    return !$('.explain-costs').hasClass('visibility-hidden');
  },

  _buffers: function () {
    return !$('.explain-buffers').hasClass('visibility-hidden');
  },

  _timing: function () {
    return !$('.explain-timing').hasClass('visibility-hidden');
  },

  _summary: function () {
    return !$('.explain-summary').hasClass('visibility-hidden');
  },

  _settings: function () {
    return !$('.explain-settings').hasClass('visibility-hidden');
  },

  _clearMessageTab: function () {
    $('.sql-editor-message').html('');
  },

  executeQuery: function (sqlEditorController) {
    this._clearMessageTab();
    sqlEditorController.check_data_changes_to_execute_query();
  },

  explainAnalyze: function (sqlEditorController) {
    const explainObject = {
      format: 'json',
      analyze: true,
      verbose: this._verbose(),
      costs: this._costsEnabled(),
      buffers: this._buffers(),
      timing: this._timing(),
      summary: this._summary(),
      settings: this._settings(),
    };
    this._clearMessageTab();
    sqlEditorController.check_data_changes_to_execute_query(explainObject);
  },

  explain: function (sqlEditorController) {
    // let explainQuery = `EXPLAIN (FORMAT JSON, ANALYZE OFF, VERBOSE ${verbose}, COSTS ${costEnabled}, BUFFERS OFF, TIMING OFF) `;
    const explainObject = {
      format: 'json',
      analyze: false,
      verbose: this._verbose(),
      costs: this._costsEnabled(),
      buffers: false,
      timing: false,
      summary: this._summary(),
      settings: this._settings(),
    };
    this._clearMessageTab();
    sqlEditorController.check_data_changes_to_execute_query(explainObject);
  },

  download: function (sqlEditorController) {
    let sqlQuery = sqlEditorController.gridView.query_tool_obj.getSelection();

    if (!sqlQuery) {
      sqlQuery = sqlEditorController.gridView.query_tool_obj.getValue();
    }

    if (!sqlQuery) return;
    let extension = sqlEditorController.preferences.csv_field_separator === ',' ? '.csv': '.txt';
    let filename = 'data-' + new Date().getTime() + extension;

    if (!sqlEditorController.is_query_tool) {
      filename = sqlEditorController.table_name + extension;
    }

    sqlEditorController.trigger_csv_download(sqlQuery, filename);
  },

  commentBlockCode: function (sqlEditorController) {
    let codeMirrorObj = sqlEditorController.gridView.query_tool_obj;

    if (!codeMirrorObj.getValue()) return;

    codeMirrorObj.toggleComment(codeMirrorObj.getCursor(true), codeMirrorObj.getCursor(false));
  },

  commentLineCode: function (sqlEditorController) {
    let codeMirrorObj = sqlEditorController.gridView.query_tool_obj;

    if (!codeMirrorObj.getValue()) return;

    codeMirrorObj.lineComment(codeMirrorObj.getCursor(true),
      codeMirrorObj.getCursor(false),
      {lineComment: '--'}
    );
  },

  uncommentLineCode: function (sqlEditorController) {
    let codeMirrorObj = sqlEditorController.gridView.query_tool_obj;

    if (!codeMirrorObj.getValue()) return;

    codeMirrorObj.uncomment(codeMirrorObj.getCursor(true),
      codeMirrorObj.getCursor(false),
      {lineComment: '--'}
    );
  },

  focusOut: function () {
    document.activeElement.blur();
    pgWindow.document.activeElement.blur();
  },

  toggleCaseOfSelectedText: function (sqlEditorController) {
    let codeMirrorObj = sqlEditorController.gridView.query_tool_obj;
    let selectedText = codeMirrorObj.getSelection();

    if (!selectedText) return;

    if (selectedText === selectedText.toUpperCase()) {
      codeMirrorObj.replaceSelection(selectedText.toLowerCase());
    } else {
      codeMirrorObj.replaceSelection(selectedText.toUpperCase());
    }
  },

  executeCommit: function (sqlEditorController) {
    var self = this;
    sqlEditorController.special_sql = 'COMMIT;';
    self.executeQuery(sqlEditorController);
  },

  executeRollback: function (sqlEditorController) {
    var self = this;
    sqlEditorController.special_sql = 'ROLLBACK;';
    self.executeQuery(sqlEditorController);
  },

  saveDataChanges: function (sqlEditorController) {
    sqlEditorController.close_on_save = false;
    sqlEditorController.save_data();
  },
};

module.exports = queryToolActions;
