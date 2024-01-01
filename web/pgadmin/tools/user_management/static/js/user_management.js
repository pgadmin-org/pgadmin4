/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import gettext from 'sources/gettext';
import { showChangeUserPassword, showUrlDialog } from '../../../../static/js/Dialogs/index';
import { showUserManagement } from './UserManagementDialog';

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

  // This is a callback function to show user management dialog.
  show_users() {
    showUserManagement();
  }
}

pgAdmin.UserManagement = UserManagement.getInstance();

module.exports = {
  UserManagement: UserManagement,
};
