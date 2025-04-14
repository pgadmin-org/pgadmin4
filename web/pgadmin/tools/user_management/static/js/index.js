/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import pgAdmin from 'sources/pgadmin';
import gettext from 'sources/gettext';
import { showChangeUserPassword, showUrlDialog } from '../../../../static/js/Dialogs/index';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import Component from './Component';

class UserManagement {
  static instance;

  static getInstance(...args) {
    if (!UserManagement.instance) {
      UserManagement.instance = new UserManagement(...args);
    }
    return UserManagement.instance;
  }

  init() {
    if (this.initialized)
      return;
    this.initialized = true;
  }

  // This is a callback function to show change user dialog.
  change_password(url) {
    showChangeUserPassword(url);
  }

  // This is a callback function to show 2FA dialog.
  show_mfa(url) {
    showUrlDialog(gettext('Authentication'), url, 'mfa.html', 1000, 600);
  }

  // This is a callback function to show user management tab.
  launchUserManagement() {
    let handler = pgAdmin.Browser.getDockerHandler?.(BROWSER_PANELS.USER_MANAGEMENT, pgAdmin.Browser.docker.default_workspace);
    handler.focus();
    handler.docker.openTab({
      id: BROWSER_PANELS.USER_MANAGEMENT,
      title: gettext('User Management'),
      content: <Component />,
      closable: true,
      cache: false,
      group: 'playground'
    }, BROWSER_PANELS.MAIN, 'middle', true);

    return true;
  }
}

pgAdmin.UserManagement = UserManagement.getInstance();

module.exports = {
  UserManagement: UserManagement,
};
