/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/***
 * Contains pgAdmin4 related SlickGrid formatters.
 *
 * @module Formatters
 * @namespace Slick
 */

(function($) {
  // register namespace
  $.extend(true, window, {
    'Slick': {
      'Formatters': {
        'JsonString': JsonFormatter,
        'Numbers': NumbersFormatter,
        'Checkmark': CheckmarkFormatter,
        'Text': TextFormatter,
        'Binary': BinaryFormatter,
      },
    },
  });

  function NullAndDefaultFormatter(row, cell, value, columnDef) {
    if (_.isUndefined(value) && columnDef.has_default_val) {
      return '<span class=\'pull-left disabled_cell\'>[default]</span>';
    } else if (
      (_.isUndefined(value) && columnDef.not_null) ||
      (_.isUndefined(value) || value === null)
    ) {
      return '<span class=\'pull-left disabled_cell\'>[null]</span>';
    }
    return null;
  }

  function NullAndDefaultNumberFormatter(row, cell, value, columnDef) {
    if (_.isUndefined(value) && columnDef.has_default_val) {
      return '<span class=\'pull-right disabled_cell\'>[default]</span>';
    } else if (
      (_.isUndefined(value) && columnDef.not_null) ||
      (_.isUndefined(value) || value === null)
    ) {
      return '<span class=\'pull-right disabled_cell\'>[null]</span>';
    }
    return null;
  }

  function JsonFormatter(row, cell, value, columnDef) {
    // If column has default value, set placeholder
    var data = NullAndDefaultFormatter(row, cell, value, columnDef);
    if (data) {
      return data;
    } else {
      // Stringify only if it's json object
      if (typeof value === 'object' && !Array.isArray(value)) {
        return _.escape(JSON.stringify(value));
      } else if (Array.isArray(value)) {
        var temp = [];
        $.each(value, function(i, val) {
          if (typeof val === 'object') {
            temp.push(JSON.stringify(val));
          } else {
            temp.push(val);
          }
        });
        return _.escape('[' + temp.join() + ']');
      } else {
        return _.escape(value);
      }
    }
  }

  function NumbersFormatter(row, cell, value, columnDef) {
    // If column has default value, set placeholder
    var data = NullAndDefaultNumberFormatter(row, cell, value, columnDef);
    if (data) {
      return data;
    } else {
      return '<span style=\'float:right\'>' + _.escape(value) + '</span>';
    }
  }

  function CheckmarkFormatter(row, cell, value, columnDef) {
    /* Checkbox has 3 states
     * 1) checked=true
     * 2) unchecked=false
     * 3) indeterminate=null
     */
    var data = NullAndDefaultFormatter(row, cell, value, columnDef);
    if (data) {
      return data;
    } else {
      return value ? 'true' : 'false';
    }
  }

  function TextFormatter(row, cell, value, columnDef) {
    // If column has default value, set placeholder
    var data = NullAndDefaultFormatter(row, cell, value, columnDef);
    if (data) {
      return data;
    } else {
      return _.escape(value);
    }
  }

  function BinaryFormatter(row, cell, value, columnDef) {
    // If column has default value, set placeholder
    var data = NullAndDefaultFormatter(row, cell, value, columnDef);
    if (data) {
      return data;
    } else {
      return '<span class=\'pull-left disabled_cell\'>[' + _.escape(value) + ']</span>';
    }
  }
})(window.jQuery);
