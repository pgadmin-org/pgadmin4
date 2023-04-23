/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('bundled_browser',[
  'pgadmin.browser',
  'sources/browser/index',
  'top/tools/erd/static/js/index',
  'top/tools/psql/static/js/index',
], function(pgBrowser) {
  pgBrowser.init();
});
