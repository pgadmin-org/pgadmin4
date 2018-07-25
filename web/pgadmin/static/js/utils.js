//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import _ from 'underscore';

export function parseShortcutValue(obj) {
  var shortcut = '';
  if (obj.alt) { shortcut += 'alt+'; }
  if (obj.shift) { shortcut += 'shift+'; }
  if (obj.control) { shortcut += 'ctrl+'; }
  shortcut += obj.key.char.toLowerCase();
  return shortcut;
}

export function findAndSetFocus(container) {
  if (container.length == 0) {
    return;
  }
  setTimeout(function() {
    var first_el = container
      .find('button.fa-plus:first');

    if (first_el.length == 0) {
      first_el = container
        .find('.pgadmin-controls:first>input:enabled,.CodeMirror-scroll');
    }

    if(first_el.length > 0) {
      first_el[0].focus();
    } else {
      container[0].focus();
    }
  }, 200);
}

let isValidData = (data) => (!_.isUndefined(data) && !_.isNull(data));
let isFunction = (fn) => (_.isFunction(fn));
let isString = (str) => (_.isString(str));

export {
  isValidData, isFunction, isString,
};
