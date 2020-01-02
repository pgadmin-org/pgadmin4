/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(['translations'], function (translations) {

  /***
   * This method behaves as a drop-in replacement for flask translation rendering.
   * It uses the same translation file under the hood and uses flask to determine the language.
   * It is slightly tweaked to work like sprintf
   * ex. translate("some %s text", "cool")
   *
   * @param {String} text
   */
  return function gettext(text) {

    var rawTranslation = translations[text] ? translations[text] : text;

    if(arguments.length == 1) {
      return rawTranslation;
    }

    try {
      let replaceArgs = arguments;
      return rawTranslation.split('%s')
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
      return rawTranslation;
    }
  };
});
