
/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';
import React from 'react';
import FileManager from './components/FileManager';
import { getBrowser } from '../../../../static/js/utils';
import pgAdmin from 'sources/pgadmin';

export default class FileManagerModule {
  static instance;

  static getInstance(...args) {
    if(!FileManagerModule.instance) {
      FileManagerModule.instance = new FileManagerModule(...args);
    }
    return FileManagerModule.instance;
  }

  constructor(pgAdmin) {
    this.pgAdmin = pgAdmin;
  }

  init() {
    if(this.initialized)
      return;
    this.initialized = true;

    if(this.pgAdmin.server_mode == 'True') {
      // Define the nodes on which the menus to be appear
      this.pgAdmin.Browser.add_menus([{
        name: 'storage_manager',
        module: this,
        applies: ['tools'],
        callback: 'openStorageManager',
        priority: 11,
        label: gettext('Storage Manager...'),
        enable: true,
      }]);
    }
  }

  openStorageManager(path) {
    this.show({
      dialog_type: 'storage_dialog',
      supported_types: ['sql', 'csv', 'json', '*'],
      dialog_title: gettext('Storage Manager'),
      path: path,
    });
  }

  showInternal(params, onOK, onCancel, modalObj) {
    const modal = modalObj || pgAdmin.Browser.notifier;
    let title = params.dialog_title;
    if(!title) {
      if(params.dialog_type == 'create_file') {
        title = gettext('Save File');
      } else if(params.dialog_type == 'open_file'){
        title = gettext('Open File');
      }else if(params.dialog_type == 'select_file') {
        title = gettext('Select File');
      } else {
        title = gettext('Storage Manager');
      }
    }
    modal.showModal(title, (closeModal)=>{
      return (
        <FileManager
          params={params}
          closeModal={closeModal}
          onCancel={onCancel}
          onOK={onOK}
          sharedStorages={this.pgAdmin.server_mode == 'True' ? this.pgAdmin.shared_storage: []}
          restrictedSharedStorage={this.pgAdmin.server_mode == 'True' ? this.pgAdmin.restricted_shared_storage: []}
        />
      );
    }, {
      isResizeable: true,
      onClose: onCancel,
      dialogWidth: 700, dialogHeight: 400
    });
  }

  async showNative(params, onOK, onCancel) {
    let res;
    let options = {};

    options['filters'] = params.supported_types?.map((v)=>(
      v=='*' ? {name: 'All Files', extensions: ['*']} :
        {name: `${v.toUpperCase()} File .${v}`, extensions:[v]}
    ));

    if(params.dialog_type == 'create_file') {
      res = await window.electronUI.showSaveDialog(options);
    } else {
      options['properties'] = ['openFile'];
      if(params.dialog_type == 'select_folder') {
        options['properties'] = ['openDirectory'];
      }
      res = await window.electronUI.showOpenDialog(options);
    }

    if(res.canceled) {
      onCancel?.();
    } else {
      onOK?.(res.filePath ? res.filePath : res.filePaths[0]);
    }
  }

  async show(params, onOK, onCancel, modalObj) {
    let {name: browser} = getBrowser();
    if(browser == 'Electron') {
      try {
        await this.showNative(params, onOK, onCancel);
      } catch {
        // Fall back to internal
        this.showInternal(params, onOK, onCancel, modalObj);
      }
    } else {
      // Fall back to internal
      this.showInternal(params, onOK, onCancel, modalObj);
    }
  }
}
