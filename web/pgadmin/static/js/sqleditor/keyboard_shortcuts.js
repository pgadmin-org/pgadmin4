const F5_KEY = 116,
  F7_KEY = 118,
  F8_KEY = 119,
  PERIOD_KEY = 190,
  FWD_SLASH_KEY = 191;

function keyboardShortcuts(sqlEditorController, queryToolActions, event) {
  if (sqlEditorController.isQueryRunning()) {
    return;
  }

  let keyCode = event.which || event.keyCode;

  if (keyCode === F5_KEY) {
    event.preventDefault();
    queryToolActions.executeQuery(sqlEditorController);
  } else if (event.shiftKey && keyCode === F7_KEY) {
    _stopEventPropagation();
    queryToolActions.explainAnalyze(sqlEditorController);
  } else if (keyCode === F7_KEY) {
    _stopEventPropagation();
    queryToolActions.explain(sqlEditorController);
  } else if (keyCode === F8_KEY) {
    event.preventDefault();
    queryToolActions.download(sqlEditorController);
  } else if ((
     (this.isMac() && event.metaKey) ||
     (!this.isMac() && event.ctrlKey)
    ) && !event.altKey && event.shiftKey && keyCode === FWD_SLASH_KEY) {
    _stopEventPropagation();
    queryToolActions.commentBlockCode(sqlEditorController);
  } else if ((
     (this.isMac() && !this.isKeyCtrlAltShift(event) && event.metaKey) ||
     (!this.isMac() && !this.isKeyAltShift(event) && event.ctrlKey)
    ) && keyCode === FWD_SLASH_KEY) {
    _stopEventPropagation();
    queryToolActions.commentLineCode(sqlEditorController);
  } else if ((
     (this.isMac() && !this.isKeyCtrlAltShift(event) && event.metaKey) ||
     (!this.isMac() && !this.isKeyAltShift(event) && event.ctrlKey)
    ) && keyCode === PERIOD_KEY) {
    _stopEventPropagation();
    queryToolActions.uncommentLineCode(sqlEditorController);
  }

  function _stopEventPropagation() {
    event.cancelBubble = true;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
}

function isMac() {
  return window.navigator.platform.search('Mac') != -1;
}

function isKeyCtrlAlt(event) {
  return event.ctrlKey || event.altKey;
}

function isKeyAltShift(event) {
  return event.altKey || event.shiftKey;
}

function isKeyCtrlShift(event) {
  return event.ctrlKey || event.shiftKey;
}

function isKeyCtrlAltShift(event) {
  return event.ctrlKey || event.altKey || event.shiftKey;
}

module.exports = {
  processEvent: keyboardShortcuts,
  isMac: isMac,
  isKeyCtrlAlt: isKeyCtrlAlt,
  isKeyAltShift: isKeyAltShift,
  isKeyCtrlShift: isKeyCtrlShift,
  isKeyCtrlAltShift: isKeyCtrlAltShift
};
