/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(['pgadmin.browser.endpoints'], function(endpoints) {
  /***
   * This method behaves as a drop-in replacement for flask url_for function.
   * It uses the exposed URLs file under the hood, and replace the substitions provided by the modules.
   *
   * ex.
   * url_for("help.static", {filename: "server_dialog.html"}) will produce the
   * output string '/help/help/server_dialog.html' from the url ->
   * '/help/help/<path:filename>'.
   *
   * @param {String} text
   * @param {Object} substitutions
   */
  return function url_for(endpoint, substitutions) {

    var rawURL = endpoints[endpoint];

    // captures things of the form <path:substitutionName>
    var substitutionGroupsRegExp = /([<])([^:^>]*:)?([^>]+)([>])/g,
      interpolated = rawURL;

    if (!rawURL)
      return rawURL;

    interpolated = interpolated.replace(
      substitutionGroupsRegExp,
      function(_origin, _1, _2, substitutionName) {
        if (substitutionName in substitutions) {
          return substitutions[substitutionName];
        }
        return _origin;
      }
    );

    return interpolated;
  };

});
