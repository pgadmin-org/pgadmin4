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
