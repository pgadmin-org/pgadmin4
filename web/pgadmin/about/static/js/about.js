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
    'sources/url_for','sources/utils','pgadmin.user_management.current_user',
  ],
  function($, alertify, pgAdmin, gettext, url_for, commonUtils, current_user) {
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
                  var self = this;
                  var container = $(this.elements.footer).find('button:not([disabled])');
                  commonUtils.findAndSetFocus(container);
                  $('#copy_textarea').on('click', function(){
                    //Copy the server configuration details
                    let textarea = document.getElementById('about-textarea');
                    textarea.select();
                    document.execCommand('copy');
                    $('#copy_textarea').text('Copied');
                  });

                  $(this.elements.resizeHandle).on('click', function(){
                    // Set the height of the Textarea
                    var height = self.elements.dialog.scrollHeight - 300;
                    if (height < 0)
                      height = self.elements.dialog.scrollHeight - 150;
                    $('#about-textarea').css({'height':height});
                  });
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
            if(!current_user.is_admin && pgAdmin.server_mode){
              alertify.aboutDialog(
                gettext('About %s', pgAdmin.Browser.utils.app_name), data
              ).resizeTo(pgAdmin.Browser.stdW.md, 300);
            }else{
              alertify.aboutDialog(
                gettext('About %s', pgAdmin.Browser.utils.app_name), data
              ).resizeTo(750, 470);
            }
          });
      },
    };

    return pgAdmin.About;
  });
