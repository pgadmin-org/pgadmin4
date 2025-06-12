/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import { BROWSER_PANELS } from '../../../browser/static/js/constants';
import { preferencesPanelData } from '../../../static/js/BrowserComponent';

export default class Preferences {
  static instance;

  static getInstance(...args) {
    if (!Preferences.instance) {
      Preferences.instance = new Preferences(...args);
    }
    return Preferences.instance;
  }

  constructor(pgAdmin, pgBrowser) {
    this.pgAdmin = pgAdmin;
    this.pgBrowser = pgBrowser;
  }

  init() {
    if (this.initialized)
      return;
    this.initialized = true;
    // Add Preferences in to file menu
    let menus = [{
      name: 'mnu_preferences',
      module: this,
      applies: ['file'],
      callback: 'show',
      enable: true,
      priority: 3,
      label: gettext('Preferences'),
    }];

    this.pgBrowser.add_menus(menus);
  }

  // This is a callback function to show preferences.
  show() {
    let handler = this.pgBrowser.getDockerHandler?.(BROWSER_PANELS.USER_MANAGEMENT, this.pgBrowser.docker.default_workspace);
    handler.focus();
    handler.docker.openTab(preferencesPanelData, BROWSER_PANELS.MAIN, 'middle', true);
  }
}
