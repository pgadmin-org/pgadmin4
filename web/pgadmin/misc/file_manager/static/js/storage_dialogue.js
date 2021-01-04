/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import Alertify from 'pgadmin.alertifyjs';

// Declare the Storage dialog
module.exports =  Alertify.dialog('fileStorageDlg', function() {
  // Dialog property
  return {
    settingUpdated: function(key, oldValue, newValue) {
      if(key == 'message') {
        this.setMessage(newValue);
      }
    },
    setup: function() {
      return {
        buttons: [{
          text: gettext('Cancel'),
          key: 27,
          className: 'btn btn-secondary fa fa-times pg-alertify-button',
        }],
        options: {
          closableByDimmer: false,
          maximizable: false,
          closable: false,
          movable: true,
          padding: !1,
          overflow: !1,
          model: 0,
          resizable: true,
          pinnable: false,
          modal: false,
          autoReset: false,
        },
      };
    },
  };
}, true, 'fileSelectionDlg');
