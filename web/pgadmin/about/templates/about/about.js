define(
  ['jquery', 'alertify', 'pgadmin'],
  function($, alertify, pgAdmin) {
    pgAdmin = pgAdmin || window.pgAdmin || {};

    /* Return back, this has been called more than once */
    if (pgAdmin.About)
        return;

    pgAdmin.About = {
      about_show: function() {
        if (!alertify.aboutDialog) {
          alertify.dialog('aboutDialog', function factory() {
            return {
              main: function(title, message) {
                this.set('title', title);
                this.message = message;
              },
              setup: function() {
                return {
                  buttons:[{ text: "OK", key: 27, className: "btn btn-primary" }],
                  options: {modal: 0, resizable: true}
                };
              },
              build: function() {
                alertify.pgDialogBuild.apply(this);
              },
              prepare:function() {
                this.setContent(this.message);
              }
            };
          });
        }

        var content = '';
        $.get("{{ url_for('about.index') }}",
            function(data) {
              alertify.aboutDialog('About {{ config.APP_NAME }}', data).resizeTo(800, 450);
            });
      }
    };

    return pgAdmin.About;
  });
