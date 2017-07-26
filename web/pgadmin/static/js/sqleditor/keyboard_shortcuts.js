const F5_KEY = 116,
  F7_KEY = 118,
  F8_KEY = 119,
  PERIOD_KEY = 190,
  FWD_SLASH_KEY = 191,
  IS_CMD_KEY = window.navigator.platform.search('Mac') != -1;

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
  } else if (((IS_CMD_KEY && event.metaKey) || (!IS_CMD_KEY && event.ctrlKey)) &&
             event.shiftKey && keyCode === FWD_SLASH_KEY) {
    _stopEventPropagation();
    sqlEditorController.commentLineCode();
  } else if (((IS_CMD_KEY && event.metaKey) || (!IS_CMD_KEY && event.ctrlKey)) &&
             event.shiftKey && keyCode === PERIOD_KEY) {
    _stopEventPropagation();
    sqlEditorController.uncommentLineCode();
  } else if (((IS_CMD_KEY && event.metaKey) || (!IS_CMD_KEY && event.ctrlKey)) &&
             keyCode === FWD_SLASH_KEY) {
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
