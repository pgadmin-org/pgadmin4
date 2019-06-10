//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
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

    /* Adding the tabindex condition makes sure that
     * when testing accessibility it works consistently across all
     * browser. For eg, in safari focus() works only when element has
     * tabindex="0", whereas in Chrome it works in any case
     */
    if (first_el.length == 0) {
      first_el = container
        .find(`
          .pgadmin-controls:first input:enabled,
          .pgadmin-controls:first .btn:not(.toggle),
          .CodeMirror-scroll`)
        .find('*[tabindex]:not([tabindex="-1"])');
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

export function getEpoch(inp_date) {
  let date_obj = inp_date ? inp_date : new Date();
  return parseInt(date_obj.getTime()/1000);
}

/* Eucladian GCD */
export function getGCD(inp_arr) {
  let gcd_for_two = (a, b) => {
    return a == 0?b:gcd_for_two(b % a, a);
  };

  let inp_len = inp_arr.length;
  if(inp_len <= 2) {
    return gcd_for_two(inp_arr[0], inp_arr[1]);
  }

  let result = inp_arr[0];
  for(let i=1; i<inp_len; i++) {
    result = gcd_for_two(inp_arr[i], result);
  }

  return result;
}

export function getMod(no, divisor) {
  return ((no % divisor) + divisor) % divisor;
}
