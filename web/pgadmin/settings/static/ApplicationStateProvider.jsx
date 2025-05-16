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

const ApplicationStateContext = React.createContext();

export const useApplicationState = ()=>useContext(ApplicationStateContext);

export function getToolData(localStorageId){
  let toolDataJson = JSON.parse(localStorage.getItem(localStorageId));
  localStorage.removeItem(localStorageId);   
  return toolDataJson;
}

export function ApplicationStateProvider({children}){
  const preferencesStore = usePreferences();
  const save_app_state = preferencesStore?.getPreferencesForModule('misc')?.save_app_state;
  const open_new_tab = preferencesStore?.getPreferencesForModule('browser')?.new_browser_tab_open;

  const saveToolData = (toolName, connectionInfo, transId, tool_data) =>{
    let data = {
      'tool_name': toolName,
      'connection_info': connectionInfo, 
      'trans_id': transId,
      'tool_data': tool_data
    };
    getApiInstance({'Content-Encoding': 'gzip'}).post(
      url_for('settings.save_application_state'),
      JSON.stringify(data),
    ).catch((error)=>{console.error(error);});
  };

  const enableSaveToolData = (toolName)=>{
    let tool_mapping = {'sqleditor': 'qt', 'schema_diff': 'schema_diff', 'psql': 'psql_tool', 'ERD': 'erd_tool'};
    if(open_new_tab?.includes(tool_mapping[toolName])){
      return save_app_state && getBrowser().name == 'Electron';
    }
    return save_app_state;
  };

  const value = useMemo(()=>({
    saveToolData,
    enableSaveToolData
  }), []);

  return <ApplicationStateContext.Provider value={value}>
    {children}
  </ApplicationStateContext.Provider>;

}

ApplicationStateProvider.propTypes = {
  children: PropTypes.object
};