/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import * as BackupDialog from '../../../tools/backup/static/js/backup_dialog_wrapper';
import {RestoreDialogWrapper} from '../../../tools/restore/static/js/restore_dialog_wrapper';
import SearchObjectsDialogWrapper from '../../../tools/search_objects/static/js/search_objects_dialog_wrapper';

export class DialogFactory {
  constructor(pgBrowser, $,
    alertify, DialogModel,
    backform, dialogContainerSelector) {
    this.pgBrowser = pgBrowser;
    this.jquery = $;
    this.alertify = alertify;
    this.dialogModel = DialogModel;
    this.backform = backform;
    this.dialogContainerSelector = dialogContainerSelector;
  }

  create(dialogTitle, typeOfDialog) {
    if (typeOfDialog === 'restore') {
      return this.createRestoreDialog(dialogTitle, typeOfDialog);
    } else if (typeOfDialog === 'search_objects') {
      return this.createSearchObjectsDialog(dialogTitle, typeOfDialog);
    } else {
      return this.createBackupDialog(dialogTitle, typeOfDialog);
    }
  }

  createRestoreDialog(dialogTitle, typeOfDialog) {
    return new RestoreDialogWrapper(
      this.dialogContainerSelector, dialogTitle, typeOfDialog,
      this.jquery,
      this.pgBrowser,
      this.alertify,
      this.dialogModel,
      this.backform);
  }

  createBackupDialog(dialogTitle, typeOfDialog) {
    return new BackupDialog.BackupDialogWrapper(
      this.dialogContainerSelector, dialogTitle, typeOfDialog,
      this.jquery,
      this.pgBrowser,
      this.alertify,
      this.dialogModel,
      this.backform);
  }

  createSearchObjectsDialog(dialogTitle, typeOfDialog) {
    return new SearchObjectsDialogWrapper(
      this.dialogContainerSelector, dialogTitle, typeOfDialog,
      this.jquery,
      this.pgBrowser,
      this.alertify,
      this.dialogModel,
      this.backform);
  }
}
