/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import ReactDOM from 'react-dom';
import pgAdmin from 'sources/pgadmin';
import getApiInstance from 'sources/api_instance';
import {getHelpUrl, getEPASHelpUrl} from 'pgadmin.help';
import SchemaView from 'sources/SchemaView';
import 'wcdocker';

/* The entry point for rendering React based view in properties, called in node.js */
export function getUtilityView(schema, treeNodeInfo, actionType, formType, container, containerPanel, onSave, extraData, saveBtnName, urlBase, sqlHelpUrl, helpUrl) {
  let serverInfo = treeNodeInfo && ('server' in treeNodeInfo) &&
      pgAdmin.Browser.serverInfo && pgAdmin.Browser.serverInfo[treeNodeInfo.server._id];
  let inCatalog = treeNodeInfo && ('catalog' in treeNodeInfo);
  const api = getApiInstance();
  const url = ()=>{
    return urlBase;
  };
  const confirmOnReset = pgAdmin.Browser.get_preferences_for_module('browser').confirm_on_properties_close;

  /* on save button callback, promise required */
  const onSaveClick = (isNew, data)=>new Promise((resolve, reject)=>{
    return api({
      url: url(),
      method: isNew ? 'POST' : 'PUT',
      data: Object.assign({}, data, extraData),
    }).then((res)=>{
      /* Don't warn the user before closing dialog */
      resolve(res.data);
      onSave && onSave(res.data, containerPanel);
      containerPanel.close();
    }).catch((err)=>{
      reject(err);
    });
  });

  /* Callback for help button */
  const onHelp = (isSqlHelp=false, isNew=false)=>{
    if(isSqlHelp) {
      let server = treeNodeInfo.server;
      let url = pgAdmin.Browser.utils.pg_help_path;
      let fullUrl = '';

      if (server.server_type == 'ppas') {
        fullUrl = getEPASHelpUrl(server.version);
      } else {
        if (sqlHelpUrl == '') {
          fullUrl = getHelpUrl(url, sqlHelpUrl, server.version);
        } else if (sqlHelpUrl != '') {
          fullUrl = getHelpUrl(url, sqlHelpUrl, server.version);
        } else {
          if (isNew) {
            fullUrl = getHelpUrl(url, sqlHelpUrl, server.version);
          } else {
            fullUrl = getHelpUrl(url, sqlHelpUrl, server.version);
          }
        }
      }

      window.open(fullUrl, 'postgres_help');
    } else {
      window.open(helpUrl, 'pgadmin_help');
    }
  };

  /* All other useful details can go with this object */
  const viewHelperProps = {
    mode: actionType,
    serverInfo: serverInfo ? {
      type: serverInfo.server_type,
      version: serverInfo.version,
    }: undefined,
    inCatalog: inCatalog,
  };

  let _schema = schema;

  /* Fire at will, mount the DOM */
  ReactDOM.render(
    <SchemaView
      formType={formType}
      schema={_schema}
      viewHelperProps={viewHelperProps}
      customSaveBtnName={saveBtnName}
      onSave={onSaveClick}
      onClose={()=>containerPanel.close()}
      onHelp={onHelp}
      onDataChange={()=>{
      }}
      confirmOnCloseReset={confirmOnReset}
      hasSQL={false}
      disableSqlHelp={sqlHelpUrl == undefined || sqlHelpUrl == ''}
      disableDialogHelp={helpUrl == undefined || helpUrl == ''}
    />, container);
}

/* When switching from normal node to collection node, clean up the React mounted DOM */
export function removeNodeView(container) {
  ReactDOM.unmountComponentAtNode(container);
}
