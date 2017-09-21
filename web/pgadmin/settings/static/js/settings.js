define('pgadmin.settings',
  [
    'jquery', 'alertify', 'underscore', 'sources/gettext', 'sources/url_for',
    'pgadmin.browser', 'pgadmin.browser.tool'
  ],
  // This defines the Preference/Options Dialog for pgAdmin IV.
  function($, alertify, _, gettext, url_for, pgBrowser, pgTool) {

    var pgAdmin = window.pgAdmin = window.pgAdmin || {};

    /*
     * Hmm... this module is already been initialized, we can refer to the old
     * object from here.
     */
    if (pgAdmin.Settings)
        return pgAdmin.Settings;

    pgAdmin.Settings = pgTool.extend({
      Init: function() {
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'mnu_resetlayout', module: this,
          applies: ['file'], callback: 'show',
          priority: 999, label: gettext('Reset Layout')
        }]);
      },
      // We will force unload method to not to save current layout
      // and reload the window
      show: function() {
        var obj = this;
        alertify.confirm(gettext('Reset layout'),
          gettext('Are you sure you want to reset the current layout? This will cause the application to reload and any un-saved data will be lost.'),
          function() {
            var reloadingIndicator = $('<div id="reloading-indicator"></div>');
            $('body').append(reloadingIndicator);
            // Delete the record from database as well, then only reload page
            $.ajax({
              url: url_for('settings.reset_layout'),
              type: 'DELETE',
              async: false,
              success: function() {
                // Prevent saving layout on server for next page reload.
                $(window).unbind('unload');
                window.onbeforeunload = null;
                // Now reload page
                location.reload(true);
              },
              error: function() {
                console.log('Something went wrong on server while resetting layout');
              }
            });

          },
          function() {
            // Do nothing as user canceled the operation.
          }
        );
      }
    });

    return pgAdmin.Settings;
  });
