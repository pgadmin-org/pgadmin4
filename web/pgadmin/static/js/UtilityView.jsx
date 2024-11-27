/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useRef } from 'react';
import getApiInstance from 'sources/api_instance';
import {getHelpUrl, getEPASHelpUrl} from 'pgadmin.help';
import SchemaView from 'sources/SchemaView';
import url_for from 'sources/url_for';
import ErrorBoundary from './helpers/ErrorBoundary';
import { usePgAdmin } from './BrowserComponent';
import { BROWSER_PANELS } from '../../browser/static/js/constants';
import { generateNodeUrl } from '../../browser/static/js/node_ajax';
import usePreferences from '../../preferences/static/js/store';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';

export default function UtilityView({dockerObj}) {
  const pgAdmin = usePgAdmin();
  const docker = useRef(dockerObj ?? pgAdmin.Browser.docker);

  useEffect(()=>{
    docker.current = dockerObj ?? pgAdmin.Browser.docker;
  }, [dockerObj]);

  useEffect(()=>{
    pgAdmin.Browser.Events.on('pgadmin:utility:show', (item, panelTitle, dialogProps, width=pgAdmin.Browser.stdW.default, height=pgAdmin.Browser.stdH.md)=>{
      const treeNodeInfo = pgAdmin.Browser.tree?.getTreeNodeHierarchy(item);
      const panelId = _.uniqueId(BROWSER_PANELS.UTILITY_DIALOG);
      const onClose = ()=>docker.current.close(panelId);
      docker.current.openDialog({
        id: panelId,
        title: panelTitle,
        content: (
          <ErrorBoundary>
            <UtilityViewContent
              docker={docker.current}
              panelId={panelId}
              {...dialogProps}
              treeNodeInfo={treeNodeInfo}
              actionType={dialogProps.actionType??'create'}
              formType='dialog'
              onClose={onClose}
              onSave={dialogProps.onSave ?? ((data)=>{
                if(data.errormsg) {
                  pgAdmin.Browser.notifier.alert(
                    gettext('Error'),
                    gettext(data.errormsg)
                  );
                } else if(data.data) {
                  pgAdmin.Browser.BgProcessManager.startProcess(data.data.job_id, data.data.desc);
                } else if(data.info) {
                  pgAdmin.Browser.notifier.success(data.info);
                }
                onClose();
              })}
              extraData={dialogProps.extraData??{}}
            />
          </ErrorBoundary>
        )
      }, width, height);
    });
  }, []);
  return <></>;
}

UtilityView.propTypes = {
  dockerObj: PropTypes.object,
};

/* The entry point for rendering React based view in properties, called in node.js */
function UtilityViewContent({schema, treeNodeInfo, actionType, formType, onClose,
  onSave, extraData, saveBtnName, urlBase, sqlHelpUrl, helpUrl, isTabView=true}) {

  const pgAdmin = usePgAdmin();
  const serverInfo = treeNodeInfo && ('server' in treeNodeInfo) && pgAdmin.Browser.serverInfo?.[treeNodeInfo.server._id];
  const api = getApiInstance();
  const url = ()=>{
    return urlBase;
  };
  const confirmOnReset = usePreferences().getPreferencesForModule('browser').confirm_on_properties_close;

  /* button icons */
  const saveBtnIcon = extraData.save_btn_icon;

  /* Node type & Node obj*/
  let nodeObj = extraData.nodeType? pgAdmin.Browser.Nodes[extraData.nodeType]: undefined;
  let itemNodeData = extraData?.itemNodeData ? itemNodeData: undefined;

  /* on save button callback, promise required */
  const onSaveClick = (isNew, data)=>new Promise((resolve, reject)=>{
    return api({
      url: url(),
      method: isNew ? 'POST' : 'PUT',
      data: {...data, ...extraData},
    }).then((res)=>{
      /* Don't warn the user before closing dialog */
      resolve(res.data);
      onSave?.(res.data, data);
      onClose();
    }).catch((err)=>{
      reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
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
        reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
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
    inCatalog: false,
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
          reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
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
  return (
    <ErrorBoundary>
      <SchemaView
        formType={formType}
        getInitData={initData}
        schema={_schema}
        viewHelperProps={viewHelperProps}
        customSaveBtnName={saveBtnName}
        customSaveBtnIconType={saveBtnIcon}
        onSave={onSaveClick}
        onClose={onClose}
        onHelp={onHelp}
        onDataChange={()=>{/*This is intentional (SonarQube)*/}}
        confirmOnCloseReset={confirmOnReset}
        hasSQL={nodeObj?.hasSQL && (actionType === 'create' || actionType === 'edit')}
        getSQLValue={getSQLValue}
        isTabView={isTabView}
        disableSqlHelp={sqlHelpUrl == undefined || sqlHelpUrl == ''}
        disableDialogHelp={helpUrl == undefined || helpUrl == ''}
      />
    </ErrorBoundary>
  );
}

UtilityViewContent.propTypes = {
  panelId: PropTypes.string,
  schema: PropTypes.object,
  treeNodeInfo: PropTypes.object,
  actionType: PropTypes.string,
  formType: PropTypes.string,
  onSave: PropTypes.func,
  onClose: PropTypes.func,
  extraData: PropTypes.object,
  saveBtnName: PropTypes.string,
  urlBase: PropTypes.string,
  sqlHelpUrl: PropTypes.string,
  helpUrl: PropTypes.string,
  isTabView: PropTypes.bool,
};
