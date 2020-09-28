//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import $ from 'jquery';
import gettext from 'sources/gettext';
import { getMod } from 'sources/utils';

const PERIOD_KEY = 190,
  FWD_SLASH_KEY = 191,
  ESC_KEY = 27,
  LEFT_KEY = 37,
  UP_KEY = 38,
  RIGHT_KEY = 39,
  DOWN_KEY = 40,
  K_KEY = 75;

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

/* Returns the key of shortcut */
function shortcut_key(shortcut) {
  let key = '';
  if(shortcut['key'] && shortcut['key']['char']) {
    key = shortcut['key']['char'].toUpperCase();
  }
  return key;
}

/* Converts shortcut object to title representation
 * Shortcut object is browser.get_preference().value
 */
function shortcut_title(title, shortcut) {
  let text_representation = '';

  if (typeof shortcut === 'undefined' || shortcut === null) {
    return text_representation;
  }
  if(shortcut['alt']) {
    text_representation = gettext('Alt') + '+';
  }
  if(shortcut['shift']) {
    text_representation += gettext('Shift') + '+';
  }
  if(shortcut['control']) {
    text_representation += gettext('Ctrl') + '+';
  }
  text_representation += shortcut_key(shortcut);

  return `${title} (${text_representation})`;
}

/* Returns the key char of shortcut
 * shortcut object is browser.get_preference().value
 */
function shortcut_accesskey_title(title, shortcut) {
  return `${title} (` + gettext('accesskey') + ` + ${shortcut_key(shortcut)})`;
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

// Finds the desired panel on which user wants to navigate to
function focusDockerPanel(docker, op) {
  if(!docker) {
    return;
  }

  // If no frame in focus, focus the first one
  if(!docker._focusFrame) {
    if(docker._frameList.length == 0 && docker._frameList[0]._panelList.length == 0) {
      return;
    }
    docker._frameList[0]._panelList[docker._frameList[0]._curTab].focus();
  }

  let focus_frame = docker._focusFrame,
    focus_id = 0,
    flash = false;

  // Mod is used to cycle the op
  if (op == 'switch') {
    let i, total_frames = docker._frameList.length;

    for(i = 0; i < total_frames; i++) {
      if(focus_frame === docker._frameList[i]) break;
    }
    focus_frame = docker._frameList[getMod(i+1,total_frames)];
    focus_id = focus_frame._curTab;
    flash = true;
  } else if (op == 'left') {
    focus_id = getMod(focus_frame._curTab-1, focus_frame._panelList.length);
  } else if (op == 'right') {
    focus_id = getMod(focus_frame._curTab+1, focus_frame._panelList.length);
  }

  let focus_panel = focus_frame._panelList[focus_id];

  focus_panel.$container.find('*[tabindex]:not([tabindex="-1"])').trigger('focus');
  focus_panel.focus(flash);
  return focus_panel._type;
}

/* Debugger: Keyboard Shortcuts handling */
function keyboardShortcutsDebugger($el, event, preferences, docker) {
  let panel_type = '', panel_content, $input;

  if(this.validateShortcutKeys(preferences.edit_grid_values, event)) {
    this._stopEventPropagation(event);
    panel_content = $el.find(
      'div.wcPanelTabContent:not(".wcPanelTabContentHidden")'
    );
    if(panel_content.length) {
      $input = $(panel_content).find('td.editable:first');
      if($input.length)
        $input.trigger('click');
    }
  } else if(this.validateShortcutKeys(preferences.move_next, event)) {
    this._stopEventPropagation(event);
    panel_type = focusDockerPanel(docker, 'right');
  } else if(this.validateShortcutKeys(preferences.move_previous, event)) {
    this._stopEventPropagation(event);
    panel_type = focusDockerPanel(docker, 'left');
  } else if(this.validateShortcutKeys(preferences.switch_panel, event)) {
    this._stopEventPropagation(event);
    panel_type = focusDockerPanel(docker, 'switch');
  }
  return panel_type;
}

/* Query tool: Keyboard Shortcuts handling */
function keyboardShortcutsQueryTool(
  sqlEditorController, queryToolActions, event, docker
) {
  if (sqlEditorController.isQueryRunning()) {
    return;
  }
  let keyCode = event.which || event.keyCode, panel_type = '';
  let executeKeys = sqlEditorController.preferences.execute_query;
  let explainKeys = sqlEditorController.preferences.explain_query;
  let explainAnalyzeKeys = sqlEditorController.preferences.explain_analyze_query;
  let downloadCsvKeys = sqlEditorController.preferences.download_csv;
  let nextTabKeys = sqlEditorController.preferences.move_next;
  let previousTabKeys = sqlEditorController.preferences.move_previous;
  let switchPanelKeys = sqlEditorController.preferences.switch_panel;
  let toggleCaseKeys = sqlEditorController.preferences.toggle_case;
  let commitKeys = sqlEditorController.preferences.commit_transaction;
  let rollbackKeys = sqlEditorController.preferences.rollback_transaction;
  let saveDataKeys = sqlEditorController.preferences.save_data;
  let queryToolKeys = sqlEditorController.preferences.show_query_tool;

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
  } else if (this.validateShortcutKeys(commitKeys, event)) {
    // If transaction buttons are disabled then no need to execute commit.
    if (!sqlEditorController.is_transaction_buttons_disabled) {
      this._stopEventPropagation(event);
      queryToolActions.executeCommit(sqlEditorController);
    }
  } else if (this.validateShortcutKeys(rollbackKeys, event)) {
    // If transaction buttons are disabled then no need to execute rollback.
    if (!sqlEditorController.is_transaction_buttons_disabled) {
      this._stopEventPropagation(event);
      queryToolActions.executeRollback(sqlEditorController);
    }
  } else if (this.validateShortcutKeys(saveDataKeys, event)) {
    this._stopEventPropagation(event);
    queryToolActions.saveDataChanges(sqlEditorController);
  } else if (this.validateShortcutKeys(queryToolKeys, event)) {
    this._stopEventPropagation(event);
    queryToolActions.openQueryTool(sqlEditorController);
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
  } else if ((
    (this.isMac() && event.metaKey) ||
     (!this.isMac() && event.ctrlKey)
  ) && !event.altKey && event.shiftKey && keyCode === K_KEY) {
    this._stopEventPropagation(event);
    queryToolActions.formatSql(sqlEditorController);
  }  else if (keyCode == ESC_KEY) {
    queryToolActions.focusOut(sqlEditorController);
    /*Apply only for sub-dropdown*/
    if($(event.target).hasClass('dropdown-item')
        && $(event.target).closest('.dropdown-submenu').length > 0) {
      $(event.target).closest('.dropdown-submenu').find('.dropdown-menu').removeClass('show');
    }
  } else if(this.validateShortcutKeys(nextTabKeys, event)) {
    this._stopEventPropagation(event);
    panel_type = focusDockerPanel(docker, 'right');
  } else if(this.validateShortcutKeys(previousTabKeys, event)) {
    this._stopEventPropagation(event);
    panel_type = focusDockerPanel(docker, 'left');
  } else if(this.validateShortcutKeys(switchPanelKeys, event)) {
    this._stopEventPropagation(event);
    panel_type = focusDockerPanel(docker, 'switch');
  } else if(keyCode === UP_KEY || keyCode === DOWN_KEY) {
    /*Apply only for dropdown*/
    if($(event.target).closest('.dropdown-menu').length > 0) {
      this._stopEventPropagation(event);
      let currLi = $(event.target).closest('li');
      /*close all the submenus on movement*/
      $(event.target).closest('.dropdown-menu').find('.show').removeClass('show');

      if(keyCode === UP_KEY) {
        currLi = currLi.prev();
      }
      else if(keyCode === DOWN_KEY){
        currLi = currLi.next();
      }

      /*do not focus on divider, disabled and d-none */
      while(currLi.hasClass('dropdown-divider')
        || currLi.hasClass('d-none')
        || currLi.find('.dropdown-item').first().hasClass('disabled')) {
        if(keyCode === UP_KEY) {
          currLi = currLi.prev();
        }
        else if(keyCode === DOWN_KEY){
          currLi = currLi.next();
        }
      }
      currLi.find('.dropdown-item').trigger('focus');
    }
  } else if(keyCode === LEFT_KEY || keyCode === RIGHT_KEY) {
    /*Apply only for dropdown*/
    if($(event.target).closest('.dropdown-menu').length > 0) {
      this._stopEventPropagation(event);
      let currLi = $(event.target).closest('li');

      if(keyCode === RIGHT_KEY) {
        /*open submenu if any*/
        if(currLi.hasClass('dropdown-submenu')){
          currLi.find('.dropdown-menu').addClass('show');
          currLi.find('.dropdown-menu .dropdown-item').first().trigger('focus');
        }
      } else if(keyCode === LEFT_KEY) {
        /*close submenu*/
        let currMenu = currLi.closest('.dropdown-menu');
        if(currMenu.closest('.dropdown-submenu').length > 0) {
          currMenu.removeClass('show');
          currLi = currMenu.closest('.dropdown-submenu');
          currLi.find('.dropdown-item').trigger('focus');
        }
      }
    }
  } else {
    // Macros
    let macroId = this.validateMacros(sqlEditorController, event);

    if  (macroId !== false) {
      this._stopEventPropagation(event);
      queryToolActions.executeMacro(sqlEditorController, macroId);
    }
  }

  return panel_type;
}

function validateMacros(sqlEditorController, event) {
  let keyCode = event.which || event.keyCode;

  let macro = sqlEditorController.macros.filter(mc =>
    mc.alt == event.altKey &&
    mc.control  == event.ctrlKey &&
    mc.key_code == keyCode);

  if (macro.length == 1) {
    return macro[0].id;
  }

  return false;
}

export {
  keyboardShortcutsDebugger as processEventDebugger,
  keyboardShortcutsQueryTool as processEventQueryTool,
  focusDockerPanel, validateShortcutKeys, validateMacros,
  _stopEventPropagation, isMac, isKeyCtrlAlt, isKeyAltShift, isKeyCtrlShift,
  isKeyCtrlAltShift, isAltShiftBoth, isCtrlShiftBoth, isCtrlAltBoth,
  shortcut_key, shortcut_title, shortcut_accesskey_title,
};
