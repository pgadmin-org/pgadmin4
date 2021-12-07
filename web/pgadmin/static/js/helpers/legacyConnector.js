/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* This file will have wrappers and connectors used by React components to
 * re-use any existing non-react components.
 * These functions may not be needed once all are migrated
 */

import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';
import Notify from './Notifier';

export function confirmDeleteRow(onOK, onCancel, title, message) {
  Notify.confirm(
    title || gettext('Delete Row'),
    message || gettext('Are you sure you wish to delete this row?'),
    function() {
      onOK();
      return true;
    },
    function() {
      onCancel();
      return true;
    }
  );
}

/* Used by file select component to re-use existing logic */
export function showFileDialog(dialogParams, onFileSelect) {
  let params = {
    supported_types: dialogParams.supportedTypes || [],
    dialog_type: dialogParams.dialogType || 'select_file',
    dialog_title: dialogParams.dialogTitle || '',
    btn_primary: dialogParams.btnPrimary || '',
  };
  pgAdmin.FileManager.init();
  pgAdmin.FileManager.show_dialog(params);

  const onFileSelectClose = (value)=>{
    removeListeners();
    onFileSelect(value);
  };
  const onDialogClose = ()=>removeListeners();
  pgAdmin.Browser.Events.on('pgadmin-storage:finish_btn:' + params.dialog_type, onFileSelectClose);
  pgAdmin.Browser.Events.on('pgadmin-storage:cancel_btn:' + params.dialog_type, onDialogClose);

  const removeListeners = ()=>{
    pgAdmin.Browser.Events.off('pgadmin-storage:finish_btn:' + params.dialog_type, onFileSelectClose);
    pgAdmin.Browser.Events.off('pgadmin-storage:cancel_btn:' + params.dialog_type, onDialogClose);
  };
}

export function onPgadminEvent(eventName, handler) {
  pgAdmin.Browser.Events.on(eventName, handler);
}

export function offPgadminEvent(eventName, handler) {
  pgAdmin.Browser.Events.off(eventName, handler);
}
