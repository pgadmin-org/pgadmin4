//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import { getMod } from 'sources/utils';

function isMac() {
  return window.navigator.userAgentData?.platform === 'macOS'
   ||  window.navigator.platform.search('Mac') != -1;
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
  if(shortcut && shortcut['key'] && shortcut['key']['char']) {
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

export {
  focusDockerPanel, validateShortcutKeys,
  _stopEventPropagation, isMac, isKeyCtrlAlt, isKeyAltShift, isKeyCtrlShift,
  isKeyCtrlAltShift, isAltShiftBoth, isCtrlShiftBoth, isCtrlAltBoth,
  shortcut_key, shortcut_title, shortcut_accesskey_title,
};
