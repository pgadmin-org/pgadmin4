/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

const endpoints = require('pgadmin.browser.endpoints');

module.exports = function(endpoint, substitutions) {
  let rawURL = endpoints[endpoint];

  // captures things of the form <path:substitutionName>
  let substitutionGroupsRegExp = /([<])([^:^>]*:)?([^>]+)([>])/g,
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
