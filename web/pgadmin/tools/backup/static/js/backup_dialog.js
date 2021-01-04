/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from '../../../../static/js/gettext';
import Backform from '../../../../static/js/backform.pgadmin';
import {Dialog} from '../../../../static/js/alertify/dialog';
import url_for from 'sources/url_for';
import axios from 'axios/index';

export class BackupDialog extends Dialog {
  constructor(pgBrowser, $, alertify, BackupModel, backform = Backform) {
    super(gettext('Backup Error'),
      '<div class=\'backup_dialog\'></div>',
      pgBrowser, $, alertify, BackupModel, backform
    );
  }

  url_for_utility_exists(id, params){
    return url_for('backup.utility_exists', {
      'sid': id,
      'backup_obj_type': params == null ? 'objects' : 'servers',
    });
  }

  draw(action, aciTreeItem, params, width=0, height=0) {
    const serverInformation = this.retrieveAncestorOfTypeServer(aciTreeItem);

    if (!serverInformation) {
      return;
    }

    if (!this.hasBinariesConfiguration(serverInformation)) {
      return;
    }

    var sid = serverInformation._type == 'database' ? serverInformation._pid : serverInformation._id;
    const baseUrl = this.url_for_utility_exists(sid, params);
    // Check pg_dump or pg_dumpall utility exists or not.
    let that = this;
    axios.get(
      baseUrl
    ).then(function(res) {
      if (!res.data.success) {
        that.alertify.alert(
          gettext('Utility not found'),
          res.data.errormsg
        );
        return;
      }

      const typeOfDialog = BackupDialog.typeOfDialog(params);

      if (!that.canExecuteOnCurrentDatabase(aciTreeItem)) {
        return;
      }

      const dialog = that.createOrGetDialog(
        BackupDialog.dialogTitle(typeOfDialog),
        typeOfDialog
      );

      dialog(true).resizeTo(width, height);
    }).catch(function() {
      that.alertify.alert(
        gettext('Utility not found'),
        gettext('Failed to fetch Utility information')
      );
      return;
    });
  }

  static typeOfDialog(params) {
    if (params === null) {
      return 'backup_objects';
    }
    let typeOfDialog = 'server';
    if (!_.isUndefined(params['globals']) && params['globals']) {
      typeOfDialog = 'globals';
    }
    return typeOfDialog;
  }

  static dialogTitle(typeOfDialog) {
    if (typeOfDialog === 'backup_objects') {
      return null;
    }
    return ((typeOfDialog === 'globals') ?
      gettext('Backup Globals...') :
      gettext('Backup Server...'));
  }

  dialogName(typeOfDialog) {
    if (typeOfDialog === 'backup_objects') {
      return typeOfDialog;
    }
    return 'BackupDialog_' + typeOfDialog;
  }
}
