/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import ReactDOM from 'react-dom/client';
import BrowserComponent from '../js/BrowserComponent';
import MainMenuFactory from '../../browser/static/js/MainMenuFactory';
import Theme from '../js/Theme';

define('app', [
  'sources/pgadmin', 'bundled_browser',
], function(pgAdmin) {
  let initializeModules = function(obj) {
    for (let key in obj) {
      let module = obj[key];

      if (typeof module?.init == 'function') {
        try {
          module.init();
        }
        catch (e) {
          console.warn(e.stack || e);
        }
      }
      else if (typeof module?.Init == 'function') {
        try {
          module.Init();
        }
        catch (e) {
          console.warn(e.stack || e);
        }
      }
    }
  };

  // Initialize modules registered to pgAdmin, pgAdmin.Browser and Tools object.
  initializeModules(pgAdmin);
  initializeModules(pgAdmin.Browser);
  initializeModules(pgAdmin.Tools);
  pgAdmin.Browser.docker = {};

  // Add menus from back end.
  pgAdmin.Browser.utils.addBackendMenus(pgAdmin.Browser);

  // Create menus after all modules are initialized.
  MainMenuFactory.createMainMenus();

  const root = ReactDOM.createRoot(document.querySelector('#root'));
  root.render(
    <Theme>
      <BrowserComponent pgAdmin={pgAdmin} />
    </Theme>
  );
});
