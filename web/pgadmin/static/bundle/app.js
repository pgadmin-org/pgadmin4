/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import ReactDOM from 'react-dom';
import MainMenuFactory from '../../browser/static/js/MainMenuFactory';
import AppMenuBar from '../js/AppMenuBar';
import Theme from '../js/Theme';

define('app', [
  'sources/pgadmin', 'bundled_browser',
], function(pgAdmin) {
  let initializeModules = function(Object) {
    for (let key in Object) {
      let module = Object[key];

      if (module && module.init && typeof module.init == 'function') {
        try {
          module.init();
        }
        catch (e) {
          console.warn(e.stack || e);
        }
      }
      else if (module && module.Init && typeof module.Init == 'function') {
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

  // Add menus from back end.
  pgAdmin.Browser.utils.addBackendMenus(pgAdmin.Browser);

  // Create menus after all modules are initialized.
  MainMenuFactory.createMainMenus();

  const menuContainerEle = document.querySelector('#main-menu-container');
  if(menuContainerEle) {
    ReactDOM.render(<Theme><AppMenuBar /></Theme>, document.querySelector('#main-menu-container'));
  }
});
