define('bundled_browser',[
  'pgadmin.browser',
  'sources/browser/server_groups/servers/databases/external_tables/index',
], function(pgBrowser) {
  pgBrowser.init();
});
