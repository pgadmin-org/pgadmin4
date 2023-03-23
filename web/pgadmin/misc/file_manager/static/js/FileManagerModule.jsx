
/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';
import Notifier from '../../../../static/js/helpers/Notifier';
import React from 'react';
import FileManager from './components/FileManager';
import { getBrowser } from '../../../../static/js/utils';

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
    const modal = modalObj || Notifier;
    let title = params.dialog_title;
    if(!title) {
      if(params.dialog_type == 'create_file') {
        title = gettext('Save File');
      } else if(params.dialog_type == 'select_file') {
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

  showNative(params, onOK, onCancel) {
    // https://docs.nwjs.io/en/latest/References/Changes%20to%20DOM/
    let fileEle = document.createElement('input');
    let accept = params.supported_types?.map((v)=>(v=='*' ? '' : `.${v}`))?.join(',');
    fileEle.setAttribute('type', 'file');
    fileEle.setAttribute('accept', accept);
    fileEle.onchange = (e)=>{
      if(e.target.value) {
        onOK?.(e.target.value);
      } else {
        onCancel?.();
      }
    };
    if(params.dialog_type == 'create_file') {
      fileEle.setAttribute('nwsaveas', '');
    } else if(params.dialog_type == 'select_folder') {
      fileEle.setAttribute('nwdirectory', '');
    }
    fileEle.dispatchEvent(new MouseEvent('click'));
  }

  show(params, onOK, onCancel, modalObj) {
    let {name: browser} = getBrowser();
    if(browser == 'Nwjs') {
      try {
        this.showNative(params, onOK, onCancel);
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
