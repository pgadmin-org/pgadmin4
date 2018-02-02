import $ from 'jquery';

let queryToolActions = {
  _verbose: function () {
    return $('.explain-verbose').hasClass('visibility-hidden') ? 'OFF' : 'ON';
  },

  _costsEnabled: function () {
    return $('.explain-costs').hasClass('visibility-hidden') ? 'OFF' : 'ON';
  },

  _buffers: function () {
    return $('.explain-buffers').hasClass('visibility-hidden') ? 'OFF' : 'ON';
  },

  _timing: function () {
    return $('.explain-timing').hasClass('visibility-hidden') ? 'OFF' : 'ON';
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
    let explainAnalyzeQuery = `EXPLAIN (FORMAT JSON, ANALYZE ON, VERBOSE ${verbose}, COSTS ${costEnabled}, BUFFERS ${buffers}, TIMING ${timing}) `;
    this._clearMessageTab();
    sqlEditorController.execute(explainAnalyzeQuery);
  },

  explain: function (sqlEditorController) {
    let costEnabled = this._costsEnabled();
    let verbose = this._verbose();

    let explainQuery = `EXPLAIN (FORMAT JSON, ANALYZE OFF, VERBOSE ${verbose}, COSTS ${costEnabled}, BUFFERS OFF, TIMING OFF) `;
    this._clearMessageTab();
    sqlEditorController.execute(explainQuery);
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

  focusOut: function() {
    document.activeElement.blur();
    window.top.document.activeElement.blur();
  },
};

module.exports = queryToolActions;
