/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(['translations'], function (translations) {

  /***
   * This method behaves as a drop-in replacement for flask translation rendering.
   * It uses the same translation file under the hood and uses flask to determine the language.
   *
   * ex. translate("some %(adjective)s text", {adjective: "cool"})
   *
   * @param {String} text
   * @param {Object} substitutions
   */
  return function gettext(text, substitutions) {

    var rawTranslation = translations[text] ? translations[text] : text;

    // captures things of the form %(substitutionName)s
    var substitutionGroupsRegExp = /([^%]*)%\(([^\)]+)\)s(.*)/;
    var matchFound;

    var interpolated = rawTranslation;
    do {
      matchFound = false;
      interpolated = interpolated.replace(substitutionGroupsRegExp, function (_, textBeginning, substitutionName, textEnd) {
        matchFound = true;
        return textBeginning + substitutions[substitutionName] + textEnd;
      });
    } while (matchFound);

    return interpolated;
  };

});