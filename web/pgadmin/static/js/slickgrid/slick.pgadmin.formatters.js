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
        "JsonString": JsonFormatter
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

})(jQuery);
