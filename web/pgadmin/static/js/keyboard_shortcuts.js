//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import $ from 'jquery';

const PERIOD_KEY = 190,
  FWD_SLASH_KEY = 191,
  ESC_KEY = 27,
  LEFT_KEY = 37,
  UP_KEY = 38,
  RIGHT_KEY = 39,
  DOWN_KEY = 40;

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

/* Function use to validate shortcut keys */
function validateShortcutKeys(user_defined_shortcut, event) {
  if(!user_defined_shortcut) {
    return false;
  }

  let keyCode = event.which || event.keyCode;
  return user_defined_shortcut.alt == event.altKey &&
    user_defined_shortcut.shift == event.shiftKey &&
    user_defined_shortcut.control == event.ctrlKey &&
    user_defined_shortcut.key.key_code == keyCode;
}

/* Debugger: Keyboard Shortcuts handling */
function keyboardShortcutsDebugger($el, event, user_defined_shortcuts) {
  let panel_id, panel_content, $input;
  let edit_grid_keys = user_defined_shortcuts.edit_grid_keys,
    next_panel_keys = user_defined_shortcuts.next_panel_keys,
    previous_panel_keys = user_defined_shortcuts.previous_panel_keys;

  if(this.validateShortcutKeys(edit_grid_keys, event)) {
    this._stopEventPropagation(event);
    panel_content = $el.find(
      'div.wcPanelTabContent:not(".wcPanelTabContentHidden")'
    );
    if(panel_content.length) {
      $input = $(panel_content).find('td.editable:first');
      if($input.length)
        $input.trigger('click');
    }
  } else if(this.validateShortcutKeys(next_panel_keys, event)) {
    this._stopEventPropagation(event);
    panel_id = this.getInnerPanel($el, 'right');
  } else if(this.validateShortcutKeys(previous_panel_keys, event)) {
    this._stopEventPropagation(event);
    panel_id = this.getInnerPanel($el, 'left');
  }
  return panel_id;
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
function keyboardShortcutsQueryTool(
  sqlEditorController, keyboardShortcutConfig, queryToolActions, event
) {
  if (sqlEditorController.isQueryRunning()) {
    return;
  }
  let keyCode = event.which || event.keyCode, panel_id;
  let executeKeys = keyboardShortcutConfig['execute'];
  let explainKeys = keyboardShortcutConfig['explain'];
  let explainAnalyzeKeys = keyboardShortcutConfig['explain_analyze'];
  let downloadCsvKeys = keyboardShortcutConfig['download_csv'];
  let nextPanelKeys = keyboardShortcutConfig['move_next'];
  let previousPanelKeys = keyboardShortcutConfig['move_previous'];
  let toggleCaseKeys = keyboardShortcutConfig['toggle_case'];

  if (this.validateShortcutKeys(executeKeys, event)) {
    this._stopEventPropagation(event);
    queryToolActions.executeQuery(sqlEditorController);
  } else if (this.validateShortcutKeys(explainKeys, event)) {
    this._stopEventPropagation(event);
    queryToolActions.explain(sqlEditorController);
  } else if (this.validateShortcutKeys(explainAnalyzeKeys, event)) {
    this._stopEventPropagation(event);
    queryToolActions.explainAnalyze(sqlEditorController);
  } else if (this.validateShortcutKeys(downloadCsvKeys, event)) {
    this._stopEventPropagation(event);
    queryToolActions.download(sqlEditorController);
  } else if (this.validateShortcutKeys(toggleCaseKeys, event)) {
    this._stopEventPropagation(event);
    queryToolActions.toggleCaseOfSelectedText(sqlEditorController);
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
  }  else if (keyCode == ESC_KEY) {
    queryToolActions.focusOut(sqlEditorController);
  } else if(this.validateShortcutKeys(nextPanelKeys, event)) {
    this._stopEventPropagation(event);
    panel_id = this.getInnerPanel(sqlEditorController.container, 'right');
  } else if(this.validateShortcutKeys(previousPanelKeys, event)) {
    this._stopEventPropagation(event);
    panel_id = this.getInnerPanel(sqlEditorController.container, 'left');
  } else if(keyCode === UP_KEY || keyCode === DOWN_KEY) {
    /*Apply only for dropdown*/
    if($(event.target).closest('.dropdown-menu').length > 0) {
      this._stopEventPropagation(event);
      let currLi = $(event.target).closest('li');
      /*close all the submenus on movement*/
      $(event.target).closest('.dropdown-menu').find('.open').removeClass('open');

      /*do not focus on divider*/
      let isDivider = true;
      while(isDivider) {
        if(keyCode === UP_KEY) {
          currLi = currLi.prev();
        }
        else if(keyCode === DOWN_KEY){
          currLi = currLi.next();
        }
        if(!currLi.hasClass('divider')) {
          isDivider = false;
        }
      }
      currLi.find('a:first').focus();
    }
  } else if(keyCode === LEFT_KEY || keyCode === RIGHT_KEY) {
    /*Apply only for dropdown*/
    if($(event.target).closest('.dropdown-menu').length > 0) {
      this._stopEventPropagation(event);
      let currLi = $(event.target).closest('li');

      if(keyCode === RIGHT_KEY) {
        /*open submenu if any*/
        if(currLi.hasClass('dropdown-submenu')){
          currLi.addClass('open');
          currLi = currLi.find('.dropdown-menu li:first-child');
        }
      } else if(keyCode === LEFT_KEY) {
        /*close submenu*/
        let currLiMenu = currLi.closest('.dropdown-menu');
        if(currLiMenu.closest('.dropdown-submenu').length > 0) {
          currLiMenu.closest('.dropdown-submenu').removeClass('open');
          currLi = currLiMenu.closest('.dropdown-submenu');
        }
      }
      currLi.find('a:first').focus();
    }
  }


  return panel_id;
}

module.exports = {
  processEventDebugger: keyboardShortcutsDebugger,
  processEventQueryTool: keyboardShortcutsQueryTool,
  getInnerPanel: getInnerPanel,
  validateShortcutKeys: validateShortcutKeys,
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
