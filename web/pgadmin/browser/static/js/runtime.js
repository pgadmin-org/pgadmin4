/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import url_for from 'sources/url_for';
import $ from 'jquery';
import * as Alertify from 'pgadmin.alertifyjs';
import gettext from 'sources/gettext';

const pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

_.extend(pgBrowser, {
  // This function is used to send signal to runtime.
  send_signal_to_runtime: function(cmd_string) {
    $.ajax({
      url: url_for('browser.signal_runtime'),
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        'command': cmd_string,
      }),
    }).fail(function(xhr, error) {
      Alertify.pgNotifier(error, xhr, gettext('Failed to send signal to runtime.'));
    });
  },

  // This function is callback function when 'Configure...' menu is clicked.
  mnu_configure_runtime: function() {
    this.send_signal_to_runtime('Runtime Open Configuration');
  },

  // This function is callback function when 'View log...' menu is clicked.
  mnu_viewlog_runtime: function() {
    this.send_signal_to_runtime('Runtime Open View Log');
  },
});

export {pgBrowser};
