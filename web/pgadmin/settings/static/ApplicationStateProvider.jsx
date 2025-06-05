/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import getApiInstance from '../../static/js/api_instance';
import url_for from 'sources/url_for';
import { getBrowser } from '../../static/js/utils';
import usePreferences from '../../preferences/static/js/store';
import pgAdmin from 'sources/pgadmin';

const ApplicationStateContext = React.createContext();
export const useApplicationState = ()=>useContext(ApplicationStateContext);

export function getToolData(localStorageId){
  let toolDataJson = JSON.parse(localStorage.getItem(localStorageId));
  localStorage.removeItem(localStorageId);   
  return toolDataJson;
}

export function deleteToolData(panelId, closePanelId){
  const saveAppState = usePreferences.getState().getPreferencesForModule('misc')?.save_app_state;
  if(saveAppState){
    if(panelId == closePanelId){
      let api = getApiInstance();
      api.delete(
        url_for('settings.delete_application_state'), {data:{'panelId': panelId}}
      ).then(()=> { /* Sonar Qube */}).catch(function(error) {
        pgAdmin.Browser.notifier.pgRespErrorNotify(error);
      });
    }  
  }
};

export function ApplicationStateProvider({children}){
  const preferencesStore = usePreferences();
  const saveAppState = preferencesStore?.getPreferencesForModule('misc')?.save_app_state;
  const openNewTab = preferencesStore?.getPreferencesForModule('browser')?.new_browser_tab_open;

  const saveToolData = (toolName, connectionInfo, transId, toolData) =>{
    let data = {
      'tool_name': toolName,
      'connection_info': connectionInfo, 
      'trans_id': transId,
      'tool_data': toolData
    };
    getApiInstance({'Content-Encoding': 'gzip'}).post(
      url_for('settings.save_application_state'),
      JSON.stringify(data),
    ).catch((error)=>{console.error(error);});
  };

  const isSaveToolDataEnabled = (toolName)=>{
    let toolMapping = {'sqleditor': 'qt', 'schema_diff': 'schema_diff', 'psql': 'psql_tool', 'ERD': 'erd_tool'};
    if(openNewTab?.includes(toolMapping[toolName])){
      return saveAppState && getBrowser().name == 'Electron';
    }
    return saveAppState;
  };

  const value = useMemo(()=>({
    saveToolData,
    isSaveToolDataEnabled,
  }), []);

  return <ApplicationStateContext.Provider value={value}>
    {children}
  </ApplicationStateContext.Provider>;

}

ApplicationStateProvider.propTypes = {
  children: PropTypes.object
};