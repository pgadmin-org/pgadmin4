define(
  ['jquery', 'alertify', 'pgadmin', 'underscore', 'backform', 'pgadmin.backform'],

  // This defines the Preference/Options Dialog for pgAdmin IV.
  function($, alertify, pgAdmin, _, Backform) {
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
        var obj = this;
        alertify.confirm('{{ _('Reset layout') }}',
          '{{ _('Are you sure you want to reset the current layout? This will cause the application to reload and any un-saved data will be lost.') }}',
          function() {
            // Delete the record from database as well, then only reload page
            $.ajax({
              url: '{{ url_for('settings.reset_layout') }}',
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
    };

    return pgAdmin.Settings;
  });
