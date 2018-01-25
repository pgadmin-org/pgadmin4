import $ from 'jquery';

// Debugger
const EDIT_KEY = 71,  // Key: G -> Grid values
  LEFT_ARROW_KEY = 37,
  RIGHT_ARROW_KEY = 39,
  F5_KEY = 116,
  F7_KEY = 118,
  F8_KEY = 119,
  PERIOD_KEY = 190,
  FWD_SLASH_KEY = 191;

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

function isAltShiftBoth(event) {
  return event.altKey && event.shiftKey && !event.ctrlKey;
}

function isCtrlShiftBoth(event) {
  return event.ctrlKey && event.shiftKey && !event.altKey;
}

function isCtrlAltBoth(event) {
  return event.ctrlKey && event.altKey && !event.shiftKey;
}

function _stopEventPropagation(event) {
  event.cancelBubble = true;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

/* Debugger: Keyboard Shortcuts handling */
function keyboardShortcutsDebugger($el, event) {
  let keyCode = event.which || event.keyCode;

  // To handle debugger's internal tab navigation like Parameters/Messages...
  if (this.isAltShiftBoth(event)) {
    // Get the active wcDocker panel from DOM element
    let panel_id, panel_content, $input;
    switch(keyCode) {
    case LEFT_ARROW_KEY:
      this._stopEventPropagation(event);
      panel_id = this.getInnerPanel($el, 'left');
      break;
    case RIGHT_ARROW_KEY:
      this._stopEventPropagation(event);
      panel_id = this.getInnerPanel($el, 'right');
      break;
    case EDIT_KEY:
      this._stopEventPropagation(event);
      panel_content = $el.find(
        'div.wcPanelTabContent:not(".wcPanelTabContentHidden")'
      );
      if(panel_content.length) {
        $input = $(panel_content).find('td.editable:first');
        if($input.length)
          $input.click();
      }
      break;
    }
    // Actual panel starts with 1 in wcDocker
    return panel_id;
  }
}

// Finds the desired panel on which user wants to navigate to
function getInnerPanel($el, direction) {
  if(!$el || !$el.length)
    return false;

  let total_panels = $el.find('.wcPanelTab');
  // If no panels found OR if single panel
  if (!total_panels.length || total_panels.length == 1)
    return false;

  let active_panel = $(total_panels).filter('.wcPanelTabActive'),
    id = parseInt($(active_panel).attr('id')),
    fist_panel = 0,
    last_panel = total_panels.length - 1;

  // Find desired panel
  if (direction == 'left') {
    if(id > fist_panel)
      id--;
  } else {
    if (id < last_panel)
      id++;
  }
  return id;
}

/* Query tool: Keyboard Shortcuts handling */
function keyboardShortcutsQueryTool(sqlEditorController, queryToolActions, event) {
  if (sqlEditorController.isQueryRunning()) {
    return;
  }
  let keyCode = event.which || event.keyCode, panel_id;

  if (keyCode === F5_KEY) {
    event.preventDefault();
    queryToolActions.executeQuery(sqlEditorController);
  } else if (event.shiftKey && keyCode === F7_KEY) {
    this._stopEventPropagation(event);
    queryToolActions.explainAnalyze(sqlEditorController);
  } else if (keyCode === F7_KEY) {
    this._stopEventPropagation(event);
    queryToolActions.explain(sqlEditorController);
  } else if (keyCode === F8_KEY) {
    event.preventDefault();
    queryToolActions.download(sqlEditorController);
  } else if ((
     (this.isMac() && event.metaKey) ||
     (!this.isMac() && event.ctrlKey)
    ) && !event.altKey && event.shiftKey && keyCode === FWD_SLASH_KEY) {
    this._stopEventPropagation(event);
    queryToolActions.commentBlockCode(sqlEditorController);
  } else if ((
     (this.isMac() && !this.isKeyCtrlAltShift(event) && event.metaKey) ||
     (!this.isMac() && !this.isKeyAltShift(event) && event.ctrlKey)
    ) && keyCode === FWD_SLASH_KEY) {
    this._stopEventPropagation(event);
    queryToolActions.commentLineCode(sqlEditorController);
  } else if ((
     (this.isMac() && !this.isKeyCtrlAltShift(event) && event.metaKey) ||
     (!this.isMac() && !this.isKeyAltShift(event) && event.ctrlKey)
    ) && keyCode === PERIOD_KEY) {
    this._stopEventPropagation(event);
    queryToolActions.uncommentLineCode(sqlEditorController);
  } else if (this.isAltShiftBoth(event) && keyCode === LEFT_ARROW_KEY) {
    // Goto previous side panel
    this._stopEventPropagation(event);
    panel_id = this.getInnerPanel(
      sqlEditorController.container, 'left'
    );
  } else if (this.isAltShiftBoth(event) && keyCode === RIGHT_ARROW_KEY) {
    // Goto next side panel
    this._stopEventPropagation(event);
    panel_id = this.getInnerPanel(
      sqlEditorController.container, 'right'
    );
  }
  return panel_id;
}

module.exports = {
  processEventDebugger: keyboardShortcutsDebugger,
  processEventQueryTool: keyboardShortcutsQueryTool,
  getInnerPanel: getInnerPanel,
  // misc functions
  _stopEventPropagation: _stopEventPropagation,
  isMac: isMac,
  isKeyCtrlAlt: isKeyCtrlAlt,
  isKeyAltShift: isKeyAltShift,
  isKeyCtrlShift: isKeyCtrlShift,
  isKeyCtrlAltShift: isKeyCtrlAltShift,
  isAltShiftBoth: isAltShiftBoth,
  isCtrlShiftBoth: isCtrlShiftBoth,
  isCtrlAltBoth: isCtrlAltBoth,
};
