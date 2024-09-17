/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useMemo, useRef } from 'react';

import getApiInstance from 'sources/api_instance';
import {getHelpUrl, getEPASHelpUrl} from 'pgadmin.help';
import SchemaView from 'sources/SchemaView';
import gettext from 'sources/gettext';
import { generateNodeUrl } from '../../browser/static/js/node_ajax';
import { usePgAdmin } from '../../static/js/BrowserComponent';
import { LAYOUT_EVENTS, LayoutDockerContext } from '../../static/js/helpers/Layout';
import usePreferences from '../../preferences/static/js/store';
import PropTypes from 'prop-types';

export default function ObjectNodeProperties({panelId, node, treeNodeInfo, nodeData, actionType, formType, onEdit, onSave, onClose,
  isActive, setIsStale, isStale}) {
  const layoutDocker = React.useContext(LayoutDockerContext);
  const nodeType = nodeData?._type;
  const pgAdmin = usePgAdmin();
  let serverInfo = treeNodeInfo && ('server' in treeNodeInfo) &&
      pgAdmin.Browser.serverInfo?.[treeNodeInfo.server._id];
  let inCatalog = treeNodeInfo && ('catalog' in treeNodeInfo);
  let isActionTypeCopy = actionType == 'copy';
  // If the actionType is set to 'copy' it is necessary to retrieve the details
  // of the existing node. Therefore, specify the actionType as 'edit' to
  // facilitate this process.
  let urlBase = generateNodeUrl.call(node, treeNodeInfo, isActionTypeCopy ? 'edit' : actionType, nodeData, false, node.url_jump_after_node);
  const api = getApiInstance();
  // To check node data is updated or not
  const staleCounter = useRef(0);
  const url = (isNew)=>{
    return urlBase + (isNew ? '' : nodeData._id);
  };
  const isDirty = useRef(false); // useful for warnings
  let warnOnCloseFlag = true;
  const confirmOnCloseReset = usePreferences().getPreferencesForModule('browser').confirm_on_properties_close;
  let updatedData =  ['table', 'partition'].includes(nodeType) && !_.isEmpty(nodeData.rows_cnt) ? {rows_cnt: nodeData.rows_cnt} : undefined;

  const objToString = (obj) => (
    (obj && typeof obj === 'object') ? Object.keys(obj).sort().reduce(
      (acc, key) => (acc + `${key}=` + objToString(obj[key])), ''
    ) : String(obj)
  );

  const treeNodeId = objToString(treeNodeInfo);

  let schema = useMemo(
    () => node.getSchema(treeNodeInfo, nodeData),
    [treeNodeId]
  );

  // We only have two actionTypes, 'create' and 'edit' to initiate the dialog,
  // so if isActionTypeCopy is true, we should revert back to "create" since
  // we are duplicating the node.
  if (isActionTypeCopy) {
    actionType = 'create';
  }

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
    if(actionType === 'create' && !isActionTypeCopy) {
      resolve({});
    } else {
      // Do not call the API if tab is not active.
      if(!isActive && actionType == 'properties') {
        return;
      }
      api.get(url(false))
        .then((res)=>{
          let data = res.data;
          if (isActionTypeCopy) {
            // Delete the idAttribute while copying the node.
            delete data[schema.idAttribute];
            data = node.copy(data);
          }
          resolve(data);
        })
        .catch((err)=>{
          pgAdmin.Browser.notifier.pgNotifier('error', err, gettext('Failed to fetch data'), function(msg) {
            if (msg == 'CRYPTKEY_SET') {
              return Promise.resolve(initData());
            } else if (msg == 'CRYPTKEY_NOT_SET') {
              reject(new Error(gettext('The master password is not set.')));
            }
            reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
          });

        })
        .then(()=>{
          // applies only for properties tab
          setIsStale?.(false);
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
      onSave?.(res.data);
    }).catch((err)=>{
      pgAdmin.Browser.notifier.pgNotifier('error-noalert', err, '', function(msg) {
        if (msg == 'CRYPTKEY_SET') {
          return Promise.resolve(onSaveClick(isNew, data));
        } else if (msg == 'CRYPTKEY_NOT_SET') {
          reject(new Error(gettext('The master password is not set.')));
        }
        reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
      });
    });
  });

  /* Called when switched to SQL tab, promise required */
  const getSQLValue = (isNew, changedData)=>{
    const msqlUrl = generateNodeUrl.call(node, treeNodeInfo, 'msql', nodeData, !isNew, node.url_jump_after_node);
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
  const onHelp = (isSqlHelp=false, isNew=false)=>{
    if(isSqlHelp) {
      let server = treeNodeInfo.server;
      let helpUrl = pgAdmin.Browser.utils.pg_help_path;
      let fullUrl = '';

      if (server.server_type == 'ppas' && node.epasHelp) {
        fullUrl = getEPASHelpUrl(server.version, node.epasURL);
      } else if (node.sqlCreateHelp == '' && node.sqlAlterHelp != '') {
        fullUrl = getHelpUrl(helpUrl, node.sqlAlterHelp, server.version);
      } else if (node.sqlCreateHelp != '' && node.sqlAlterHelp == '') {
        fullUrl = getHelpUrl(helpUrl, node.sqlCreateHelp, server.version);
      } else if (isNew) {
        fullUrl = getHelpUrl(helpUrl, node.sqlCreateHelp, server.version);
      } else {
        fullUrl = getHelpUrl(helpUrl, node.sqlAlterHelp, server.version);
      }

      window.open(fullUrl, 'postgres_help');
    } else {
      window.open(node.dialogHelp, 'pgadmin_help');
    }
  };

  /* A warning before closing the dialog with unsaved changes, based on preference */
  const warnBeforeChangesLost = (id)=>{
    if(panelId != id) {
      warnBeforeChangesLost();
    }
    if (warnOnCloseFlag && confirmOnCloseReset) {
      if(isDirty.current) {
        pgAdmin.Browser.notifier.confirm(
          gettext('Warning'),
          gettext('Changes will be lost. Are you sure you want to close the dialog?'),
          function() {
            onClose(true);
          },
          null
        );
      } else {
        onClose(true);
      }
    } else {
      onClose(true);
    }
  };

  useEffect(()=>{
    if(formType == 'dialog') {
      /* Bind the close event and check if user should be warned */
      layoutDocker.eventBus.registerListener(LAYOUT_EVENTS.CLOSING, warnBeforeChangesLost);
    }
    return ()=>{
      layoutDocker.eventBus.deregisterListener(LAYOUT_EVENTS.CLOSING, warnBeforeChangesLost);
    };
  }, []);

  /* All other useful details can go with this object */
  const viewHelperProps = {
    mode: actionType,
    serverInfo: serverInfo ? {
      type: serverInfo.server_type,
      version: serverInfo.version,
    }: undefined,
    inCatalog: inCatalog,
  };

  // Show/Hide security group for nodes under the catalog
  if('catalog' in treeNodeInfo
    && formType !== 'tab') {
    schema.filterGroups = [gettext('Security')];
  }
  // Reset stale counter.
  useMemo(()=> {
    staleCounter.current = 0;
  }, [nodeData?._id]);

  const key = useMemo(()=>{
    // If node data is updated increase the counter to show updated data.
    if(isStale) {
      staleCounter.current += 1;
    }
    if( actionType != 'properties' || isActive) {
      // Not required any action.
    } else {
      initData = ()=>Promise.resolve({});
    }

    return nodeData?._id + '-' + staleCounter.current;
  }, [isActive, nodeData?._id, isStale]);

  if(!isActive && actionType == 'properties') {
    return <></>;
  }

  /* Fire at will, mount the DOM */
  return (
    <SchemaView
      key={key}
      formType={formType}
      getInitData={initData}
      updatedData={updatedData}
      schema={schema}
      viewHelperProps={viewHelperProps}
      onSave={onSaveClick}
      onClose={()=>onClose()}
      onHelp={onHelp}
      onEdit={onEdit}
      onDataChange={(dataChanged)=>{
        isDirty.current = dataChanged;
      }}
      confirmOnCloseReset={confirmOnCloseReset}
      hasSQL={node.hasSQL && (actionType === 'create' || actionType === 'edit')}
      getSQLValue={getSQLValue}
      disableSqlHelp={node.sqlAlterHelp == '' && node.sqlCreateHelp == '' && !node.epasHelp}
      disableDialogHelp={node.dialogHelp == undefined || node.dialogHelp == ''}
    />
  );
}

ObjectNodeProperties.propTypes = {
  panelId: PropTypes.string,
  node: PropTypes.func,
  treeNodeInfo: PropTypes.object,
  nodeData: PropTypes.object,
  actionType: PropTypes.string,
  formType: PropTypes.string,
  onEdit: PropTypes.func,
  onSave: PropTypes.func,
  onClose: PropTypes.func,
  isActive: PropTypes.bool,
  setIsStale: PropTypes.func,
  isStale: PropTypes.bool,
};
