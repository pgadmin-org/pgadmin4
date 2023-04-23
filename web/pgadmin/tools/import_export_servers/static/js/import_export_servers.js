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
import gettext from 'sources/gettext';
import Theme from 'sources/Theme';
import ImportExportServers from './ImportExportServers';
import pgBrowser from 'top/browser/static/js/browser';

export default class ImportExportServersModule {
  static instance;

  static getInstance(...args) {
    if(!ImportExportServersModule.instance) {
      ImportExportServersModule.instance = new ImportExportServersModule(...args);
    }
    return ImportExportServersModule.instance;
  }

  init() {
    if (this.initialized)
      return;
    this.initialized = true;

    // Define the nodes on which the menus to be appear
    let menus = [{
      name: 'import_export_servers',
      module: this,
      applies: ['tools'],
      callback: 'showImportExportServers',
      enable: true,
      priority: 3,
      label: gettext('Import/Export Servers...'),
    }];

    pgBrowser.add_menus(menus);
  }

  // This is a callback function to show import/export servers when user click on menu item.
  showImportExportServers() {
    // Register dialog panel
    pgBrowser.Node.registerUtilityPanel();
    let panel = pgBrowser.Node.addUtilityPanel(880, 550),
      j = panel.$container.find('.obj_properties').first();
    panel.title(gettext('Import/Export Servers'));

    ReactDOM.render(
      <Theme>
        <ImportExportServers
          onClose={() => {
            ReactDOM.unmountComponentAtNode(j[0]);
            panel.close();
          }}/>
      </Theme>, j[0]);
  }
}
