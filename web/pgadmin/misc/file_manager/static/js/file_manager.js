/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import './select_dialogue';
import './create_dialogue';

define('misc.file_manager', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.alertifyjs',
], function(gettext, url_for, $, _, pgAdmin, Alertify) {
  pgAdmin = pgAdmin || window.pgAdmin || {};

  /*
   *
   *
   * Hmm... this module is already been initialized, we can refer to the old
   * object from here.
   */
  if (pgAdmin.FileManager) {
    return pgAdmin.FileManager;
  }

  pgAdmin.FileManager = {
    init: function() {
      if (this.initialized) {
        return;
      }

      this.initialized = true;

    },
    // Call dialogs subject to dialog_type param
    show_dialog: function(params) {
      let dialogWidth = pgAdmin.Browser.stdW.calc();
      let dialogHeight = pgAdmin.Browser.stdH.calc();
      if (params.dialog_type == 'create_file') {
        Alertify.createModeDlg(params).resizeTo(dialogWidth, dialogHeight);
      } else {
        Alertify.fileSelectionDlg(params).resizeTo(dialogWidth, dialogHeight);
      }
    },
  };

  return pgAdmin.FileManager;
});
