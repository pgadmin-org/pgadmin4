/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import ReactDOM from 'react-dom';
import SchemaView from '../../../../../../static/js/SchemaView';
import Theme from '../../../../../../static/js/Theme';

export default class DialogWrapper {
  constructor(dialogContainerSelector, dialogTitle, typeOfDialog, alertify, serverInfo) {
    this.dialogContainerSelector = dialogContainerSelector;
    this.dialogTitle = dialogTitle;
    this.alertify = alertify;
    this.typeOfDialog = typeOfDialog;
    this.serverInfo = serverInfo;

    let self = this;
    this.hooks = {
      onshow: ()=>{
        self.createDialog(self.elements.content);
      },
      onclose: ()=>{
        self.cleanupDialog(self.elements.content);
      }
    };
  }

  main(title, dialogSchema, okCallback) {
    this.set('title', title);
    this.dialogSchema = dialogSchema;
    this.okCallback = okCallback;
  }

  build() {
    this.elements.dialog.classList.add('erd-dialog');
  }

  prepare() {
    /* If tooltip is mounted after alertify in dom and button is click,
    alertify re-positions itself on DOM to come in focus. This makes it lose
    the button click events. Making it modal along with following fixes things. */
    this.elements.modal.style.maxHeight=0;
    this.elements.modal.style.maxWidth='none';
    this.elements.modal.style.overflow='visible';
    this.elements.dimmer.style.display='none';
  }

  setup() {
    return {
      buttons: [],
      // Set options for dialog
      options: {
        title: this.dialogTitle,
        //disable both padding and overflow control.
        padding: !1,
        overflow: !1,
        resizable: true,
        maximizable: true,
        pinnable: false,
        closableByDimmer: false,
        modal: true,
        autoReset: false,
      },
    };
  }

  onSaveClick(_isNew, data) {
    return new Promise((resolve, reject)=>{
      let errorMsg = this.okCallback(data);
      if(errorMsg) {
        reject(errorMsg);
      } else {
        this.close();
        resolve();
      }
    });
  }

  createDialog(container) {
    let self = this;
    ReactDOM.render(
      <Theme>
        <SchemaView
          formType={'dialog'}
          getInitData={()=>Promise.resolve({})}
          schema={this.dialogSchema}
          viewHelperProps={{
            mode: 'create',
            keepCid: true,
            serverInfo: this.serverInfo,
          }}
          onSave={this.onSaveClick.bind(this)}
          onClose={()=>self.close()}
          onDataChange={()=>{/*This is intentional (SonarQube)*/}}
          hasSQL={false}
          disableSqlHelp={true}
          disableDialogHelp={true}
        />
      </Theme>, container);
  }

  cleanupDialog(container) {
    ReactDOM.unmountComponentAtNode(container);
  }
}
