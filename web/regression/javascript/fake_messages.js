//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

define('pgadmin.browser.messages',['sources/pgadmin'], function(pgAdmin) {
  let pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  if (pgBrowser.messages)
    return pgBrowser.messages;

  pgBrowser.messages = {
    'CANNOT_BE_EMPTY': '\'%s\' cannot be empty.',
    'MUST_BE_INT': '\'%s\' must be an integer.'
  };
  return pgBrowser;
});
