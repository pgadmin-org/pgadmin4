/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import gettext from 'sources/gettext';
import ImportExportServers from './ImportExportServers';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import pgAdmin from 'sources/pgadmin';

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

    pgAdmin.Browser.add_menus(menus);
  }

  // This is a callback function to show import/export servers when user click on menu item.
  showImportExportServers() {
    const panelTitle = gettext('Import/Export Servers');
    const panelId = BROWSER_PANELS.IMPORT_EXPORT_SERVERS;
    pgAdmin.Browser.docker.openDialog({
      id: panelId,
      title: panelTitle,
      manualClose: false,
      content: (
        <ImportExportServers onClose={()=>{pgAdmin.Browser.docker.close(panelId);}}/>
      )
    }, pgAdmin.Browser.stdW.lg, pgAdmin.Browser.stdH.lg);
  }
}
