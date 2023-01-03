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
import { generateNodeUrl } from './node_ajax';
import Notify from '../../../static/js/helpers/Notifier';
import gettext from 'sources/gettext';
import 'wcdocker';
import Theme from '../../../static/js/Theme';

/* The entry point for rendering React based view in properties, called in node.js */
export function getNodeView(nodeType, treeNodeInfo, actionType, itemNodeData, formType, container, containerPanel, onEdit, onSave) {
  let nodeObj = pgAdmin.Browser.Nodes[nodeType];
  let serverInfo = treeNodeInfo && ('server' in treeNodeInfo) &&
      pgAdmin.Browser.serverInfo && pgAdmin.Browser.serverInfo[treeNodeInfo.server._id];
  let inCatalog = treeNodeInfo && ('catalog' in treeNodeInfo);
  let urlBase = generateNodeUrl.call(nodeObj, treeNodeInfo, actionType, itemNodeData, false, nodeObj.url_jump_after_node);
  const api = getApiInstance();
  const url = (isNew)=>{
    return urlBase + (isNew ? '' : itemNodeData._id);
  };
  let isDirty = false; // usefull for warnings
  let warnOnCloseFlag = true;
  const confirmOnCloseReset = pgAdmin.Browser.get_preferences_for_module('browser').confirm_on_properties_close;
  let updatedData =  ['table', 'partition'].includes(nodeType) && !_.isEmpty(itemNodeData.rows_cnt) ? {rows_cnt: itemNodeData.rows_cnt} : undefined;

  let onError = (err)=> {
    if(err.response){
      console.error('error resp', err.response);
    } else if(err.request){
      console.error('error req', err.request);
    } else if(err.message){
      console.error('error msg', err.message);
    }
  };

  /* Called when dialog is opened in edit mode, promise required */
  let initData = ()=>new Promise((resolve, reject)=>{
    if(actionType === 'create') {
      resolve({});
    } else {
      api.get(url(false))
        .then((res)=>{
          resolve(res.data);
        })
        .catch((err)=>{
          if(err.response){
            console.error('error resp', err.response);
          } else if(err.request){
            console.error('error req', err.request);
          } else if(err.message){
            console.error('error msg', err.message);
          }

          if (err?.response?.data?.info == 'CRYPTKEY_MISSING') {
            Notify.pgNotifier('error', err.request, 'The master password is not set', function(msg) {
              setTimeout(function() {
                if (msg == 'CRYPTKEY_SET') {
                  resolve(initData());
                } else if (msg == 'CRYPTKEY_NOT_SET') {
                  reject(err);
                }
              }, 100);
            });
          } else if (err?.response?.data?.errormsg) {
            Notify.alert(
              gettext('Error'),
              gettext(err.response.data.errormsg)
            );

            reject(err);
          }
        });
    }
  });

  /* on save button callback, promise required */
  const onSaveClick = (isNew, data)=>new Promise((resolve, reject)=>{
    return api({
      url: url(isNew),
      method: isNew ? 'POST' : 'PUT',
      data: data,
    }).then((res)=>{
      /* Don't warn the user before closing dialog */
      warnOnCloseFlag = false;
      resolve(res.data);
      onSave && onSave(res.data);
    }).catch((err)=>{
      reject(err);
    });
  });

  /* Called when switched to SQL tab, promise required */
  const getSQLValue = (isNew, changedData)=>{
    const msqlUrl = generateNodeUrl.call(nodeObj, treeNodeInfo, 'msql', itemNodeData, !isNew, nodeObj.url_jump_after_node);
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
  const onHelp = (isSqlHelp=false, isNew=false)=>{
    if(isSqlHelp) {
      let server = treeNodeInfo.server;
      let helpUrl = pgAdmin.Browser.utils.pg_help_path;
      let fullUrl = '';

      if (server.server_type == 'ppas' && nodeObj.epasHelp) {
        fullUrl = getEPASHelpUrl(server.version);
      } else {
        if (nodeObj.sqlCreateHelp == '' && nodeObj.sqlAlterHelp != '') {
          fullUrl = getHelpUrl(helpUrl, nodeObj.sqlAlterHelp, server.version);
        } else if (nodeObj.sqlCreateHelp != '' && nodeObj.sqlAlterHelp == '') {
          fullUrl = getHelpUrl(helpUrl, nodeObj.sqlCreateHelp, server.version);
        } else {
          if (isNew) {
            fullUrl = getHelpUrl(helpUrl, nodeObj.sqlCreateHelp, server.version);
          } else {
            fullUrl = getHelpUrl(helpUrl, nodeObj.sqlAlterHelp, server.version);
          }
        }
      }

      window.open(fullUrl, 'postgres_help');
    } else {
      window.open(nodeObj.dialogHelp, 'pgadmin_help');
    }
  };

  /* A warning before closing the dialog with unsaved changes, based on preference */
  let warnBeforeChangesLost = (yesCallback)=>{
    let confirmOnClose = pgAdmin.Browser.get_preferences_for_module('browser').confirm_on_properties_close;
    if (warnOnCloseFlag && confirmOnClose) {
      if(isDirty){
        Notify.confirm(
          gettext('Warning'),
          gettext('Changes will be lost. Are you sure you want to close the dialog?'),
          function() {
            yesCallback();
            return true;
          },
          function() {
            return true;
          }
        );
      } else {
        return true;
      }
      return false;
    } else {
      yesCallback();
      return true;
    }
  };

  /* Bind the wcDocker dialog close event and check if user should be warned */
  if (containerPanel.closeable()) {
    containerPanel.on(window.wcDocker.EVENT.CLOSING, warnBeforeChangesLost.bind(
      containerPanel,
      function() {
        containerPanel.off(window.wcDocker.EVENT.CLOSING);
        /* Always clean up the react mounted dom before closing */
        removeNodeView(container);
        containerPanel.close();
      }
    ));
  }

  /* All other useful details can go with this object */
  const viewHelperProps = {
    mode: actionType,
    serverInfo: serverInfo ? {
      type: serverInfo.server_type,
      version: serverInfo.version,
    }: undefined,
    inCatalog: inCatalog,
  };

  let schema = nodeObj.getSchema.call(nodeObj, treeNodeInfo, itemNodeData);
  // Show/Hide security group for nodes under the catalog
  if('catalog' in treeNodeInfo
    && formType !== 'tab') {
    schema.filterGroups = [gettext('Security')];
  }

  /* Fire at will, mount the DOM */
  ReactDOM.render(
    <Theme>
      <SchemaView
        key={itemNodeData?._id}
        formType={formType}
        getInitData={initData}
        updatedData={updatedData}
        schema={schema}
        viewHelperProps={viewHelperProps}
        onSave={onSaveClick}
        onClose={()=>containerPanel.close()}
        onHelp={onHelp}
        onEdit={onEdit}
        onDataChange={(dataChanged)=>{
          isDirty = dataChanged;
        }}
        confirmOnCloseReset={confirmOnCloseReset}
        hasSQL={nodeObj.hasSQL && (actionType === 'create' || actionType === 'edit')}
        getSQLValue={getSQLValue}
        disableSqlHelp={nodeObj.sqlAlterHelp == '' && nodeObj.sqlCreateHelp == '' && !nodeObj.epasHelp}
        disableDialogHelp={nodeObj.dialogHelp == undefined || nodeObj.dialogHelp == ''}
      />
    </Theme>, container);
}

/* When switching from normal node to collection node, clean up the React mounted DOM */
export function removeNodeView(container) {
  ReactDOM.unmountComponentAtNode(container);
}
