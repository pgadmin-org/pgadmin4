import $ from 'jquery';

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

  _clearMessageTab: function () {
    $('.sql-editor-message').html('');
  },

  executeQuery: function (sqlEditorController) {
    if(sqlEditorController.is_query_tool) {
      this._clearMessageTab();
      sqlEditorController.execute();
    } else {
      sqlEditorController.execute_data_query();
    }
  },

  explainAnalyze: function (sqlEditorController) {
    let costEnabled = this._costsEnabled();
    let verbose = this._verbose();
    let buffers = this._buffers();
    let timing = this._timing();
    const explainObject = {
      format: 'json',
      analyze: true,
      verbose: verbose,
      costs: costEnabled,
      buffers: buffers,
      timing: timing,
      summary: false,
    };
    this._clearMessageTab();
    sqlEditorController.execute(explainObject);
  },

  explain: function (sqlEditorController) {
    let costEnabled = this._costsEnabled();
    let verbose = this._verbose();

    // let explainQuery = `EXPLAIN (FORMAT JSON, ANALYZE OFF, VERBOSE ${verbose}, COSTS ${costEnabled}, BUFFERS OFF, TIMING OFF) `;
    const explainObject = {
      format: 'json',
      analyze: false,
      verbose: verbose,
      costs: costEnabled,
      buffers: false,
      timing: false,
      summary: false,
    };
    this._clearMessageTab();
    sqlEditorController.execute(explainObject);
  },

  download: function (sqlEditorController) {
    let sqlQuery = sqlEditorController.gridView.query_tool_obj.getSelection();

    if (!sqlQuery) {
      sqlQuery = sqlEditorController.gridView.query_tool_obj.getValue();
    }

    if (!sqlQuery) return;

    let filename = 'data-' + new Date().getTime() + '.csv';

    if (!sqlEditorController.is_query_tool) {
      filename = sqlEditorController.table_name + '.csv';
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
    window.top.document.activeElement.blur();
  },

  getKeyboardShortcuts: function (sqlEditorController) {
    let executeQueryPref = window.top.pgAdmin.Browser.get_preference(
      'sqleditor', 'execute_query');
    let explainQueryPref = window.top.pgAdmin.Browser.get_preference(
      'sqleditor', 'explain_query');
    let explainAnalyzeQueryPref = window.top.pgAdmin.Browser.get_preference(
      'sqleditor', 'explain_analyze_query');
    let downloadCsvPref = window.top.pgAdmin.Browser.get_preference(
      'sqleditor', 'download_csv');
    let nextPanelPerf = window.top.pgAdmin.Browser.get_preference(
      'sqleditor', 'move_next');
    let previousPanelPerf = window.top.pgAdmin.Browser.get_preference(
      'sqleditor', 'move_previous');
    let toggleCasePerf = window.top.pgAdmin.Browser.get_preference(
      'sqleditor', 'toggle_case');

    if(!executeQueryPref && sqlEditorController.handler.is_new_browser_tab) {
      executeQueryPref = window.opener.pgAdmin.Browser.get_preference(
        'sqleditor', 'execute_query'
      ),
      explainQueryPref = window.opener.pgAdmin.Browser.get_preference(
        'sqleditor', 'explain_query'
      ),
      explainAnalyzeQueryPref = window.opener.pgAdmin.Browser.get_preference(
        'sqleditor', 'explain_analyze_query'
      ),
      downloadCsvPref = window.opener.pgAdmin.Browser.get_preference(
        'sqleditor', 'download_csv'
      ),
      nextPanelPerf = window.opener.pgAdmin.Browser.get_preference(
        'sqleditor', 'move_next'
      ),
      previousPanelPerf = window.opener.pgAdmin.Browser.get_preference(
        'sqleditor', 'move_previous'
      ),
      toggleCasePerf = window.opener.pgAdmin.Browser.get_preference(
        'sqleditor', 'toggle_case'
      );
    }

    return {
      'execute': executeQueryPref.value,
      'explain': explainQueryPref.value,
      'explain_analyze': explainAnalyzeQueryPref.value,
      'download_csv': downloadCsvPref.value,
      'move_next': nextPanelPerf.value,
      'move_previous': previousPanelPerf.value,
      'toggle_case': toggleCasePerf.value,
    };

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
};

module.exports = queryToolActions;
