define([
  'jquery', 'alertify', 'sources/pgadmin', 'sources/gettext',
  'sources/url_for', 'pgadmin.browser.tool', 'pgadmin.browser.utils'
], function($, alertify, pgAdmin, gettext, url_for, pgTool, pgUtils) {
    pgAdmin = pgAdmin || window.pgAdmin || {};

    /* Return back, this has been called more than once */
    if (pgAdmin.About)
        return;

    pgAdmin.About = pgTool.extend({
      Init: function() {
        if (this.initialized) {
          return false;
        }
        this.initialized = true;

        pgAdmin.Browser.add_menus([{
          name: 'mnu_about', module: this,
          applies: ['help'], callback: 'about_show',
          priority: 11, label:
            gettext('About %(appname)s', {appname: pgUtils.app_name})
        }]);
        return this;
      },
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
                  buttons:[{ text: gettext("OK"), key: 27, className: "btn btn-primary" }],
                  options: {
                    modal: false,
                    resizable: true,
                    maximizable: true,
                    pinnable: false,
                    closableByDimmer: false
                  }
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
        $.get(url_for('about.index'),
            function(data) {
              alertify.aboutDialog(
                gettext('About %(appname)s', {appname: pgUtils.app_name}),
                data
              ).resizeTo(800, 450);
            });
      }
    });

    return pgAdmin.About;
  });
