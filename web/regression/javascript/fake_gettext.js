//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import * as pgUtils from 'sources/utils';
import translations from 'translations';

export default function gettext(text, ...args) {
  // return text;
  return pgUtils.gettextForTranslation(translations, text, ...args);
}
