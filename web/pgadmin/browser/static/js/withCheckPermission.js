/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import current_user from 'pgadmin.user_management.current_user';
import gettext from 'sources/gettext';

export default function withCheckPermission(options, callback) {
  // Check if the user has permission to access the menu item
  return ()=>{
    options = options ?? {};
    // if the permission are not provided then no restrictions.
    if(!options.permission || (options.permission && current_user.permissions?.includes(options.permission))) {
      callback();
    } else {
      pgAdmin.Browser.notifier.alert(
        gettext('Permission Denied'),
        gettext('You don’t have the necessary permissions to access this feature. Please contact your administrator for assistance')
      );
    }
  };
}
