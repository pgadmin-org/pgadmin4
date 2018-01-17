define('app', [
  'babel-polyfill', 'sources/pgadmin', 'bundled_browser', 'pgadmin.datagrid',
], function(babelPolyFill, pgAdmin) {
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
