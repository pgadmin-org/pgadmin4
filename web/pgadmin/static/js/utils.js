//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import _ from 'underscore';
import { getTreeNodeHierarchyFromIdentifier } from 'sources/tree/pgadmin_tree_node';
import $ from 'jquery';


export function parseShortcutValue(obj) {
  var shortcut = '';
  if (obj.alt) { shortcut += 'alt+'; }
  if (obj.shift) { shortcut += 'shift+'; }
  if (obj.control) { shortcut += 'ctrl+'; }
  shortcut += obj.key.char.toLowerCase();
  return shortcut;
}

export function handleKeyNavigation(event) {
  let wizardHeader = $(event.currentTarget).find('.wizard-header');
  let wizardFooter = $(event.currentTarget).find('.wizard-footer');
  let gridElement = $(event.currentTarget).find('.select-row-cell:first');
  let gridElementLast = $(event.currentTarget).find('.select-row-cell:last');

  let firstWizardHeaderButton = $(wizardHeader).find('button:enabled:first');
  let lastWizardHeaderButton = $(wizardHeader).find('button:enabled:last');
  let lastWizardFooterBtn = $(wizardFooter).find('button:enabled:last');
  let firstWizardFooterBtn = $(wizardFooter).find('button:enabled:first');


  if (event.shiftKey && event.keyCode === 9) {
    // Move backwards
    if(firstWizardHeaderButton && $(firstWizardHeaderButton).is($(event.target))) {
      if (lastWizardFooterBtn) {
        $(lastWizardFooterBtn).focus();
        event.preventDefault();
        event.stopPropagation();
      }
    }
    else if ($(firstWizardFooterBtn).is($(event.target))){
      if ($(gridElement).find('.custom-control-input').is(':visible')){
        $(gridElementLast).find('.custom-control-input').focus();
        event.preventDefault();
        event.stopPropagation();
      }else if ($(event.currentTarget).find('.wizard-content').find('.CodeMirror-scroll').is(':visible')){
        $(lastWizardHeaderButton).focus();
      }
    }
  } else if (event.keyCode === 9) {
    // Move forwards
    // If taget is last button then goto first element
    if(lastWizardFooterBtn && $(lastWizardFooterBtn).is($(event.target))) {
      $(firstWizardHeaderButton).focus();
      event.preventDefault();
      event.stopPropagation();
    }else if (event.target.innerText == 'Name'){
      if ($(gridElement).find('.custom-control-input').is(':visible')){
        $(gridElement).find('.custom-control-input').focus();
      }else {
        $(firstWizardFooterBtn).focus();
      }
      event.preventDefault();
      event.stopPropagation();
    } else if(event.target.tagName == 'DIV') {
      $(event.currentTarget).find('.custom-control-input:first').trigger('focus');
      event.preventDefault();
      event.stopPropagation();
    } else if(event.target.tagName == 'TEXTAREA'){
      $(firstWizardFooterBtn).focus();
    }
  } else if (event.keyCode === 27){
    //close the wizard when esc key is pressed
    $(wizardHeader).find('button.ajs-close').click();
  }
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
          .pgadmin-controls:first .btn:not(.toggle),
          .pgadmin-controls:first,
          .ajs-commands:first,
          .CodeMirror-scroll,
          .pgadmin-wizard`)
        .find('*[tabindex]:not([tabindex="-1"]),input:enabled');
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

export function parseFuncParams(label) {
  let paramArr = [],
    funcName = '',
    paramStr = '';

  if(label.endsWith('()')) {
    funcName = label.substring(0, label.length-2);
  } else if(!label.endsWith(')')) {
    funcName = label;
  } else if(!label.endsWith('()') && label.endsWith(')')) {
    let i = 0,
      startBracketPos = label.length;

    /* Parse through the characters in reverse to find the param start bracket */
    i = label.length-2;
    while(i >= 0) {
      if(label[i] == '(') {
        startBracketPos = i;
        break;
      } else if(label[i] == '"') {
        /* If quotes, skip all the chars till next quote */
        i--;
        while(label[i] != '"') i--;
      }
      i--;
    }

    funcName = label.substring(0, startBracketPos);
    paramStr = label.substring(startBracketPos+1, label.length-1);

    let paramStart = 0,
      paramName = '',
      paramModes = ['IN', 'OUT', 'INOUT', 'VARIADIC'];

    i = 0;
    while(i < paramStr.length) {
      if(paramStr[i] == '"') {
        /* If quotes, skip all the chars till next quote */
        i++;
        while(paramStr[i] != '"') i++;
      } else if (paramStr[i] == ' ') {
        /* if paramName is already set, ignore till comma
         * Or if paramName is parsed as one of the modes, reset.
         */
        if(paramName == '' || paramModes.indexOf(paramName) > -1 ) {
          paramName = paramStr.substring(paramStart, i);
          paramStart = i+1;
        }
      }
      else if (paramStr[i] == ',') {
        paramArr.push([paramName, paramStr.substring(paramStart, i)]);
        paramName = '';
        paramStart = i+1;
      }
      i++;
    }
    paramArr.push([paramName, paramStr.substring(paramStart)]);
  }

  return {
    'func_name': funcName,
    'param_string': paramStr,
    'params': paramArr,
  };
}

export function quote_ident(value) {
  /* check if the string is number or not */
  let quoteIt = false;
  if (!isNaN(parseInt(value))){
    quoteIt = true;
  }

  if(value.search(/[^a-z0-9_]/g) > -1) {
    /* escape double quotes */
    value = value.replace(/"/g, '""');
    quoteIt = true;
  }

  if(quoteIt) {
    return `"${value}"`;
  } else {
    return value;
  }
}

export function fully_qualify(pgBrowser, data, item) {
  const parentData = getTreeNodeHierarchyFromIdentifier.call(pgBrowser, item);
  let namespace = '';

  if (parentData.schema !== undefined) {
    namespace = quote_ident(parentData.schema._label);
  }
  else if (parentData.view !== undefined) {
    namespace = quote_ident(parentData.view._label);
  }
  else if (parentData.catalog !== undefined) {
    namespace = quote_ident(parentData.catalog._label);
  }

  if (parentData.package !== undefined && data._type != 'package') {
    if(namespace == '') {
      namespace = quote_ident(parentData.package._label);
    } else {
      namespace += '.' + quote_ident(parentData.package._label);
    }
  }

  if(namespace != '') {
    return namespace + '.' + quote_ident(data._label);
  } else {
    return quote_ident(data._label);
  }
}

export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function titleize(i_str) {
  if(i_str === '' || i_str === null) return i_str;
  return i_str.split(' ')
    .map(w => w[0].toUpperCase() + w.substr(1).toLowerCase())
    .join(' ');
}

export function sprintf(i_str) {
  try {
    let replaceArgs = arguments;
    return i_str.split('%s')
      .map(function(w, i) {
        if(i > 0) {
          if(i < replaceArgs.length) {
            return [replaceArgs[i], w].join('');
          } else {
            return ['%s', w].join('');
          }
        } else {
          return w;
        }
      })
      .join('');
  } catch(e) {
    console.error(e);
    return i_str;
  }
}

// Modified ref: http://stackoverflow.com/a/1293163/2343 to suite pgAdmin.
// This will parse a delimited string into an array of arrays.
export function CSVToArray( strData, strDelimiter, quoteChar){
  strDelimiter = strDelimiter || ',';
  quoteChar = quoteChar || '"';

  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(
    (
    // Delimiters.
      '(\\' + strDelimiter + '|\\r?\\n|\\r|^)' +
            // Quoted fields.
            (quoteChar == '"' ? '(?:"([^"]*(?:""[^"]*)*)"|' : '(?:\'([^\']*(?:\'\'[^\']*)*)\'|') +
            // Standard fields.
            (quoteChar == '"' ? '([^"\\' + strDelimiter + '\\r\\n]*))': '([^\'\\' + strDelimiter + '\\r\\n]*))')
    ),
    'gi'
  );

  // Create an array to hold our data. Give the array
  // a default empty first row.
  var arrData = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  var arrMatches = null;

  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while ((arrMatches = objPattern.exec( strData ))){
    // Get the delimiter that was found.
    var strMatchedDelimiter = arrMatches[ 1 ];

    // Check to see if the given delimiter has a length
    // (is not the start of string) and if it matches
    // field delimiter. If id does not, then we know
    // that this delimiter is a row delimiter.
    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter){
      // Since we have reached a new row of data,
      // add an empty row to our data array.
      arrData.push( [] );
    }

    var strMatchedValue;

    // Now that we have our delimiter out of the way,
    // let's check to see which kind of value we
    // captured (quoted or unquoted).
    if (arrMatches[ 2 ]){
      // We found a quoted value. When we capture
      // this value, unescape any quotes.
      strMatchedValue = arrMatches[ 2 ].replace(new RegExp( quoteChar+quoteChar, 'g' ), quoteChar);
    } else {
      // We found a non-quoted value.
      strMatchedValue = arrMatches[ 3 ];
    }
    // Now that we have our value string, let's add
    // it to the data array.
    arrData[ arrData.length - 1 ].push( strMatchedValue );
  }
  // Return the parsed data.
  return arrData;
}
