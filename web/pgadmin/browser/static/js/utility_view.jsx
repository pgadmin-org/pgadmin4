/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
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
import Theme from '../../../static/js/Theme';
import url_for from 'sources/url_for';
import { generateNodeUrl } from './node_ajax';

/* The entry point for rendering React based view in properties, called in node.js */
export function getUtilityView(schema, treeNodeInfo, actionType, formType, container, containerPanel,
  onSave, extraData, saveBtnName, urlBase, sqlHelpUrl, helpUrl, isTabView=true) {

  let serverInfo = treeNodeInfo && ('server' in treeNodeInfo) &&
      pgAdmin.Browser.serverInfo && pgAdmin.Browser.serverInfo[treeNodeInfo.server._id];
  let inCatalog = treeNodeInfo && ('catalog' in treeNodeInfo);
  const api = getApiInstance();
  const url = ()=>{
    return urlBase;
  };
  const confirmOnReset = pgAdmin.Browser.get_preferences_for_module('browser').confirm_on_properties_close;

  /* button icons */
  const saveBtnIcon = extraData.save_btn_icon;

  /* Node type & Noen obj*/
  let nodeObj = extraData.nodeType? pgAdmin.Browser.Nodes[extraData.nodeType]: undefined;
  let itemNodeData = extraData?.itemNodeData ? itemNodeData: undefined;

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

  /* Called when switched to SQL tab, promise required */
  const getSQLValue = (isNew, changedData)=>{
    const msqlUrl = extraData?.msqlurl ? extraData.msqlurl: generateNodeUrl.call(nodeObj, treeNodeInfo, 'msql', itemNodeData, !isNew, nodeObj.url_jump_after_node);
    return new Promise((resolve, reject)=>{
      api({
        url: msqlUrl,
        method: 'GET',
        params: changedData,
      }).then((res)=>{
        resolve(res.data.data);
      }).catch((err)=>{
        onError(err);
        reject(err);
      });
    });
  };

  /* Callback for help button */
  const onHelp = (isSqlHelp=false)=>{
    if(isSqlHelp) {
      let server = treeNodeInfo.server;
      let help_url = pgAdmin.Browser.utils.pg_help_path;
      let fullUrl = '';

      if (server.server_type == 'ppas') {
        fullUrl = getEPASHelpUrl(server.version);
      } else {
        fullUrl = getHelpUrl(help_url, sqlHelpUrl, server.version);
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

  let initData = ()=>new Promise((resolve, reject)=>{
    if(actionType === 'create') {
      resolve({});
    }else{
      api.get(url_for('import_export.get_settings'))
        .then((res)=>{
          resolve(res.data.data);
        })
        .catch((err)=>{
          if(err.response){
            console.error('error resp', err.response);
          } else if(err.request){
            console.error('error req', err.request);
          } else if(err.message){
            console.error('error msg', err.message);
          }
          reject(err);
        });
    }

  });

  let onError = (err)=> {
    if(err.response){
      console.error('error resp', err.response);
    } else if(err.request){
      console.error('error req', err.request);
    } else if(err.message){
      console.error('error msg', err.message);
    }
  };
  let _schema = schema;

  /* Fire at will, mount the DOM */
  ReactDOM.render(
    <Theme>
      <SchemaView
        formType={formType}
        getInitData={initData}
        schema={_schema}
        viewHelperProps={viewHelperProps}
        customSaveBtnName={saveBtnName}
        customSaveBtnIconType={saveBtnIcon}
        onSave={onSaveClick}
        onClose={()=>containerPanel.close()}
        onHelp={onHelp}
        onDataChange={()=>{/*This is intentional (SonarQube)*/}}
        confirmOnCloseReset={confirmOnReset}
        hasSQL={nodeObj?nodeObj.hasSQL:false && (actionType === 'create' || actionType === 'edit')}
        getSQLValue={getSQLValue}
        isTabView={isTabView}
        disableSqlHelp={sqlHelpUrl == undefined || sqlHelpUrl == ''}
        disableDialogHelp={helpUrl == undefined || helpUrl == ''}
      />
    </Theme>, container);
}

/* When switching from normal node to collection node, clean up the React mounted DOM */
export function removeNodeView(container) {
  ReactDOM.unmountComponentAtNode(container);
}
