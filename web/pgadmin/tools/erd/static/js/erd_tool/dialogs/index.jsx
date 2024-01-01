/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {getTableDialogSchema} from './TableDialog';
import {getOneToManyDialogSchema} from './OneToManyDialog';
import {getManyToManyDialogSchema} from './ManyToManyDialog';

import pgAdmin from 'sources/pgadmin';
import SchemaView from '../../../../../../static/js/SchemaView';
import React from 'react';
export default class ERDDialogs {
  constructor(modalProvider) {
    this.modal = modalProvider;
  }

  onSaveClick(_isNew, data, closeModal, okCallback) {
    return new Promise((resolve, reject)=>{
      let errorMsg = okCallback(data);
      if(errorMsg) {
        reject(errorMsg);
      } else {
        closeModal();
        resolve();
      }
    });
  }

  showTableDialog(params) {
    let schema = getTableDialogSchema(
      params.attributes, params.isNew, params.tableNodes,
      params.colTypes, params.schemas);
    this.modal.showModal(params.title, (closeModal)=>{
      return (
        <SchemaView
          formType={'dialog'}
          getInitData={()=>Promise.resolve({})}
          schema={schema}
          viewHelperProps={{
            mode: 'create',
            keepCid: true,
            serverInfo: params.serverInfo,
          }}
          onSave={(...args)=>this.onSaveClick(...args, closeModal, params.callback)}
          onClose={closeModal}
          onDataChange={()=>{/*This is intentional (SonarQube)*/}}
          hasSQL={false}
          disableSqlHelp={true}
          disableDialogHelp={true}
          Notifier={this.modal}
        />
      );
    }, {
      isResizeable: true,
      dialogWidth: pgAdmin.Browser?.stdW?.lg, dialogHeight: pgAdmin.Browser?.stdH?.md,
    });
  }

  showRelationDialog(dialogName, params) {
    let schema;
    if(dialogName === 'onetomany_dialog') {
      schema = getOneToManyDialogSchema(params.attributes, params.tableNodes);
    } else if(dialogName === 'manytomany_dialog') {
      schema = getManyToManyDialogSchema(params.attributes, params.tableNodes);
    }

    this.modal.showModal(params.title, (closeModal)=>{
      return (
        <SchemaView
          formType={'dialog'}
          getInitData={()=>Promise.resolve({})}
          schema={schema}
          viewHelperProps={{
            mode: 'create',
            keepCid: true,
            serverInfo: params.serverInfo,
          }}
          onSave={(...args)=>this.onSaveClick(...args, closeModal, params.callback)}
          onClose={closeModal}
          onDataChange={()=>{/*This is intentional (SonarQube)*/}}
          hasSQL={false}
          disableSqlHelp={true}
          disableDialogHelp={true}
        />
      );
    }, {
      isResizeable: true,
      dialogWidth: pgAdmin.Browser?.stdW?.lg, dialogHeight: pgAdmin.Browser?.stdH?.md,
    });
  }
}
