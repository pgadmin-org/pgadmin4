/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { set_last_traversed_dir, getTransId } from '../../../../misc/file_manager/static/js/helpers';

define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'pgadmin.alertifyjs',
  'sources/pgadmin', 'pgadmin.browser', 'sources/csrf', 'pgadmin.file_manager',
], function (
  gettext, url_for, $, _, alertify, pgAdmin, pgBrowser, csrfToken
) {

  pgAdmin = pgAdmin || window.pgAdmin || {};
  var isServerMode = (function() { return pgAdmin.server_mode == 'True'; })();

  var pgTools = pgAdmin.Tools = pgAdmin.Tools || {};

  if(!isServerMode) {
    return;
  }

  // Return back, this has been called more than once
  if (pgAdmin.Tools.storage_manager)
    return pgAdmin.Tools.storage_manager;

  pgTools.storage_manager = {
    init: function () {
      // We do not want to initialize the module multiple times.
      if (this.initialized)
        return;

      this.initialized = true;
      csrfToken.setPGCSRFToken(pgAdmin.csrf_token_header, pgAdmin.csrf_token);

      var storage_manager = this.callback_storage_manager.bind(this);

      pgBrowser.Events.on(
        'pgadmin:tools:storage_manager', storage_manager
      );

      // Define the nodes on which the menus to be appear
      var menus = [{
        name: 'storage_manager',
        module: this,
        applies: ['tools'],
        callback: 'callback_storage_manager',
        priority: 2,
        label: gettext('Storage Manager...'),
        enable: true,
      }];

      pgBrowser.add_menus(menus);
    },

    /*
      Open the dialog for the storage functionality
    */
    callback_storage_manager: function (path) {

      var params = {
        supported_types: ['sql', 'csv', '*'],
        dialog_type: 'storage_dialog',
        dialog_title: 'Storage Manager...',
        btn_primary: undefined,
      };

      if (!_.isUndefined(path) && !_.isNull(path) && !_.isEmpty(path)) {

        var transId = getTransId(JSON.stringify(params));
        var t_res;
        if (transId.readyState == 4) {
          t_res = JSON.parse(transId.responseText);
        }
        var trans_id = _.isUndefined(t_res) ? 0 : t_res.data.fileTransId;

        set_last_traversed_dir({'path': path}, trans_id);
        pgAdmin.FileManager.init();
        pgAdmin.FileManager.show_dialog(params);
      }
      else {
        pgAdmin.FileManager.init();
        pgAdmin.FileManager.show_dialog(params);
      }
    },
  };

  return pgAdmin.Tools.storage_manager;
});
