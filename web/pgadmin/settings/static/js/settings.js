/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.settings', ['sources/pgadmin'], function(pgAdmin) {

  // This defines the Preference/Options Dialog for pgAdmin IV.
  pgAdmin = pgAdmin || window.pgAdmin || {};

  /*
   * Hmm... this module is already been initialized, we can refer to the old
   * object from here.
   */
  if (pgAdmin.Settings)
    return pgAdmin.Settings;

  pgAdmin.Settings = {
    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;
    },
    // We will force unload method to not to save current layout
    // and reload the window
    show: function() {
      pgAdmin.Browser.docker.resetLayout();
    },
  };

  return pgAdmin.Settings;
});
