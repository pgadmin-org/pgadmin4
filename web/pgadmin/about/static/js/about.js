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
import pgAdmin from 'sources/pgadmin';
import AboutComponent from './AboutComponent';
import current_user from 'pgadmin.user_management.current_user';

class About {
  static instance;

  static getInstance(...args) {
    if (!About.instance) {
      About.instance = new About(...args);
    }
    return About.instance;
  }

  init() {
    if (this.initialized)
      return;
    this.initialized = true;
  }

  // This is a callback function to show about dialog.
  about_show() {
    let dlgHeight = 470,
      dlgWidth = 750;

    if(!current_user.is_admin && pgAdmin.server_mode) {
      dlgWidth = pgAdmin.Browser.stdW.md;
      dlgHeight = 300;
    }

    // Render About component
    pgAdmin.Browser.notifier.showModal(gettext('About %s', pgAdmin.Browser.utils.app_name), () => {
      return <AboutComponent />;
    }, { isFullScreen: false, isResizeable: true, showFullScreen: true,
      isFullWidth: true, dialogWidth: dlgWidth, dialogHeight: dlgHeight, minHeight: dlgHeight
    });
  }
}

pgAdmin.About = About.getInstance();

module.exports = {
  About: About,
};
