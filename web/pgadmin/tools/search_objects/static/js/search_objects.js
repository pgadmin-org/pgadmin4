/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'pgadmin.alertifyjs',
  'sources/pgadmin', 'sources/csrf', 'pgadmin.browser.toolbar',
  'pgadmin.search_objects/search_objects_dialog',
], function(
  gettext, url_for, $, _, alertify, pgAdmin, csrfToken, toolBar, SearchObjectsDialog
) {

  var pgBrowser = pgAdmin.Browser;
  if (pgAdmin.SearchObjects)
    return pgAdmin.SearchObjects;

  pgAdmin.SearchObjects = {
    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;
      csrfToken.setPGCSRFToken(pgAdmin.csrf_token_header, pgAdmin.csrf_token);

      // Define the nodes on which the menus to be appear
      var menus = [{
        name: 'search_objects',
        module: this,
        applies: ['tools'],
        callback: 'show_search_objects',
        enable: this.search_objects_enabled,
        priority: 1,
        label: gettext('Search Objects...'),
        data: {
          data_disabled: gettext('Please select a database from the browser tree to search the database objects.'),
        },
      }, {
        name: 'search_objects',
        module: this,
        applies: ['context'],
        callback: 'show_search_objects',
        enable: this.search_objects_enabled,
        priority: 1,
        label: gettext('Search Objects...'),
      }];

      pgBrowser.add_menus(menus);
      return this;
    },

    search_objects_enabled: function(obj) {
      /* Same as query tool */
      var isEnabled = (() => {
        if (!_.isUndefined(obj) && !_.isNull(obj)) {
          if (_.indexOf(pgAdmin.unsupported_nodes, obj._type) == -1) {
            if (obj._type == 'database' && obj.allowConn) {
              return true;
            } else if (obj._type != 'database') {
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        } else {
          return false;
        }
      })();

      toolBar.enable(gettext('Search objects'), isEnabled);
      return isEnabled;
    },

    // Callback to show the dialog
    show_search_objects: function(action, item) {
      let dialog = new SearchObjectsDialog.default(
        pgBrowser,
        $,
        alertify,
        {},
      );
      dialog.draw(action, item, {}, pgBrowser.stdW.calc(pgBrowser.stdW.md), pgBrowser.stdH.calc(pgBrowser.stdH.lg));
    },
  };

  return pgAdmin.SearchObjects;
});
