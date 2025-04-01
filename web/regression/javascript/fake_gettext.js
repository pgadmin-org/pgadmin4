//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import translations from 'translations';

function gettextForTranslation(translations, ...replaceArgs) {
  const text = replaceArgs[0];
  let rawTranslation = translations[text] ? translations[text] : text;

  if(arguments.length == 2) {
    return rawTranslation;
  }

  try {
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
}

export default function gettext(text, ...args) {
  return gettextForTranslation(translations, text, ...args);
}
