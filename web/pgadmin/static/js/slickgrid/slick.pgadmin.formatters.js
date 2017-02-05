/***
 * Contains pgAdmin4 related SlickGrid formatters.
 *
 * @module Formatters
 * @namespace Slick
 */

(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "Formatters": {
        "JsonString": JsonFormatter,
        "Numbers": NumbersFormatter,
        "Checkmark": CheckmarkFormatter,
        "Text": TextFormatter,
      }
    }
  });

  function JsonFormatter(row, cell, value, columnDef, dataContext) {
    if (value == null || value === "") {
      return "";
    } else {
      // Stringify only if it's json object
      if (typeof value === "object" && !Array.isArray(value)) {
        return JSON.stringify(value);
      } else if (Array.isArray(value)) {
        var temp = [];
        $.each(value, function(i, val) {
          if (typeof val === "object") {
            temp.push(JSON.stringify(val));
          } else {
            temp.push(val)
          }
        });
        return "[" + temp.join() + "]"
      } else {
        return value;
      }
    }
  }

  function NumbersFormatter(row, cell, value, columnDef, dataContext) {
    if (_.isUndefined(value) || value === null) {
      return "<span class='pull-right'>[null]</span>";
    }
    else if (value === "") {
      return '';
    }
    else {
      return "<span style='float:right'>" + value + "</span>";
    }
  }

  function CheckmarkFormatter(row, cell, value, columnDef, dataContext) {
    /* Checkbox has 3 states
     * 1) checked=true
     * 2) unchecked=false
     * 3) indeterminate=null/''
     */
    if (value == null || value === "") {
      return "<span class='pull-left'>[null]</span>";
    }
    return value ? "true" : "false";
  }

  function TextFormatter(row, cell, value, columnDef, dataContext) {
    if (_.isUndefined(value) || value === null) {
      return "<span class='pull-left'>[null]</span>";
    }
    else {
      return value;
    }
  }

})(jQuery);
