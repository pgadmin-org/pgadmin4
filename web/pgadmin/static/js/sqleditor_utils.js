//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////
// This file contains common utilities functions used in sqleditor modules

define(['jquery'],
  function ($) {
    var sqlEditorUtils = {
      /* Reference link http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
       * Modified as per requirement.
       */
      epicRandomString: function(length) {
        var s = [];
        var hexDigits = "0123456789abcdef";
        for (var i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(
                    Math.floor(Math.random() * 0x10), 1
                  );
        }
        // bits 12-15 of the time_hi_and_version field to 0010
        s[14] = "4";
        // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
        s[8] = s[13] = s[18] = s[23] = "-";

        var uuid = s.join("");
        return uuid.replace(/-/g, '').substr(0, length);
      },

      // Returns a unique hash for input string
      getHash: function(input) {
        var hash = 0, len = input.length;
        for (var i = 0; i < len; i++) {
          hash  = ((hash << 5) - hash) + input.charCodeAt(i);
          hash |= 0; // to 32bit integer
        }
        return hash;
      },
      calculateColumnWidth: function (text) {
        // Calculate column header width based on column name or type
        // Create a temporary element with given label, append to body
        // calculate its width and remove the element.
        $('body').append(
            '<span id="pg_text" style="visibility: hidden;">'+ text + '</span>'
        );
        var width = $('#pg_text').width() + 23;
        $('#pg_text').remove(); // remove element

        return width;
      },
      capitalizeFirstLetter: function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
      }
    };
    return sqlEditorUtils;
});
