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
        "Checkmark": CheckmarkFormatter
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
    if (value == null || value === "") {
      return "";
    } else {
      return "<span style='float:right'>" + value + "</span>";
    }
  }

  function CheckmarkFormatter(row, cell, value, columnDef, dataContext) {
    if (value == null || value === "") {
      return "";
    }
    return value ? "true" : "false";
  }

})(jQuery);
