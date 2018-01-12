define(
  ['jquery', 'alertify', 'sources/pgadmin', 'underscore.string', 'sources/gettext',
    'sources/url_for',
  ],
  function($, alertify, pgAdmin, S, gettext, url_for) {
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
                  buttons:[{ text: gettext('OK'), key: 27, className: 'btn btn-primary' }],
                  options: {
                    modal: false,
                    resizable: true,
                    maximizable: true,
                    pinnable: false,
                    closableByDimmer: false,
                  },
                };
              },
              build: function() {
                alertify.pgDialogBuild.apply(this);
              },
              prepare:function() {
                this.setContent(this.message);
              },
            };
          });
        }

        $.get(url_for('about.index'),
            function(data) {
              alertify.aboutDialog(
                  S(gettext('About %s')).sprintf(pgAdmin.Browser.utils.app_name).value(), data
              ).resizeTo(800, 450);
            });
      },
    };

    return pgAdmin.About;
  });
