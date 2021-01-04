/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(
  ['jquery', 'alertify', 'sources/pgadmin', 'sources/gettext',
    'sources/url_for','sources/utils',
  ],
  function($, alertify, pgAdmin, gettext, url_for, commonUtils) {
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
                  buttons:[{ text: gettext('OK'), key: 27,
                    className: 'btn btn-primary fa fa-lg fa-check pg-alertify-button' }],
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
              hooks:{
                onshow:function(){
                  var container = $(this.elements.footer).find('button:not([disabled])');
                  commonUtils.findAndSetFocus(container);
                },
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
              gettext('About %s', pgAdmin.Browser.utils.app_name), data
            ).resizeTo(pgAdmin.Browser.stdW.md, pgAdmin.Browser.stdH.md);
          });
      },
    };

    return pgAdmin.About;
  });
