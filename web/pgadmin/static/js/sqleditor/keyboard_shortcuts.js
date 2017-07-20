const F5_KEY = 116,
  F7_KEY = 118,
  F8_KEY = 119,
  COMMA_KEY = 188,
  PERIOD_KEY = 190,
  FWD_SLASH_KEY = 191;

function keyboardShortcuts(sqlEditorController, event) {
  if (sqlEditorController.isQueryRunning()) {
    return;
  }

  let keyCode = event.which || event.keyCode;

  if (keyCode === F5_KEY) {
    event.preventDefault();
    sqlEditorController.executeQuery();
  } else if (event.shiftKey && keyCode === F7_KEY) {
    _stopEventPropagation();
    sqlEditorController.explainAnalyze(event);
  } else if (keyCode === F7_KEY) {
    _stopEventPropagation();
    sqlEditorController.explain(event);
  } else if (keyCode === F8_KEY) {
    event.preventDefault();
    sqlEditorController.download();
  } else if (event.shiftKey && event.ctrlKey && keyCode === COMMA_KEY) {
    _stopEventPropagation();
    sqlEditorController.commentLineCode();
  } else if (event.shiftKey && event.ctrlKey && keyCode === PERIOD_KEY) {
    _stopEventPropagation();
    sqlEditorController.uncommentLineCode();
  } else if (event.shiftKey && event.ctrlKey && keyCode === FWD_SLASH_KEY) {
    _stopEventPropagation();
    sqlEditorController.commentBlockCode();
  }

  function _stopEventPropagation() {
    event.cancelBubble = true;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
}

module.exports = {
  processEvent: keyboardShortcuts,
};
