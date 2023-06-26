/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import gettext from 'sources/gettext';
import PreferencesComponent from './components/PreferencesComponent';
import PreferencesTree from './components/PreferencesTree';
import pgAdmin from 'sources/pgadmin';

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

    // Render Preferences component
    pgAdmin.Browser.notifier.showModal(gettext('Preferences'), (closeModal) => {
      return <PreferencesComponent
        renderTree={(prefTreeData) => {
          // Render preferences tree component
          return <PreferencesTree pgBrowser={this.pgBrowser} data={prefTreeData} />;
        }} closeModal={closeModal} />;
    }, { isFullScreen: false, isResizeable: true, showFullScreen: true, isFullWidth: true, dialogWidth: 900, dialogHeight: 550 });
  }
}
