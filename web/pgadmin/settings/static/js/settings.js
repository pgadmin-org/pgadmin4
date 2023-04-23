/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import getApiInstance from '../../../static/js/api_instance';
import Notify from '../../../static/js/helpers/Notifier';
import { getBrowser } from '../../../static/js/utils';

define('pgadmin.settings', [
  'sources/pgadmin', 'sources/gettext', 'sources/url_for',
], function(pgAdmin, gettext, url_for) {

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
      Notify.confirm(gettext('Reset layout'),
        gettext('Are you sure you want to reset the current layout? This will cause the application to reload and any un-saved data will be lost.'),
        function() {
          const reloadingIndicator = document.createElement('div');
          reloadingIndicator.setAttribute('id', 'reloading-indicator');
          document.body.appendChild(reloadingIndicator);

          // Delete the record from database as well, then only reload page
          getApiInstance().delete(url_for('settings.reset_layout'))
            .then(()=>{
              window.onbeforeunload = null;
              // Now reload page
              location.reload(true);
              let {name: browser} = getBrowser();
              if(browser == 'Nwjs') {
                pgAdmin.Browser.create_menus();
              }
            })
            .catch(()=>{
              console.warn(
                'Something went wrong on server while resetting layout.'
              );
            });
        },
        function() {
          // Do nothing as user canceled the operation.
        }
      );
    },
  };

  return pgAdmin.Settings;
});
