/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('app', [
  'sources/pgadmin', 'bundled_browser', 'pgadmin.datagrid',
], function(pgAdmin) {
  var initializeModules = function(Object) {
    for (var key in Object) {
      var module = Object[key];
      if (module.init && typeof module.init == 'function') {
        module.init();
      }
      else if (module.Init && typeof module.Init == 'function') {
        module.Init();
      }
    }
  };

  // Initialize modules registered to pgAdmin, pgAdmin.Browser and Tools object.
  initializeModules(pgAdmin);
  initializeModules(pgAdmin.Browser);
  initializeModules(pgAdmin.Tools);

  // create menus after all modules are initialized.
  pgAdmin.Browser.create_menus();
});
