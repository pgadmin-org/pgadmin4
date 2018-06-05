/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from '../../../../static/js/gettext';
import Backform from '../../../../static/js/backform.pgadmin';
import {Dialog} from '../../../../static/js/alertify/dialog';

export class BackupDialog extends Dialog {
  constructor(pgBrowser, $, alertify, BackupModel, backform = Backform) {
    super('Backup Error',
      '<div class=\'backup_dialog\'></div>',
      pgBrowser, $, alertify, BackupModel, backform
    );
  }

  draw(action, aciTreeItem, params) {
    const serverInformation = this.retrieveAncestorOfTypeServer(aciTreeItem);

    if (!serverInformation) {
      return;
    }

    if (!this.hasBinariesConfiguration(serverInformation)) {
      return;
    }

    const typeOfDialog = BackupDialog.typeOfDialog(params);

    if (!this.canExecuteOnCurrentDatabase(aciTreeItem)) {
      return;
    }

    const dialog = this.createOrGetDialog(
      BackupDialog.dialogTitle(typeOfDialog),
      typeOfDialog
    );
    dialog(true).resizeTo('60%', '50%');
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
