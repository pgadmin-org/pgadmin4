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
import { TOOLS_SUPPORTING_RESTORE } from '../../browser/static/js/constants';
import gettext from 'sources/gettext';

const ApplicationStateContext = React.createContext();
export const useApplicationState = ()=>useContext(ApplicationStateContext);

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

  async function getToolContent(transId) {
    try {
      const res = await getApiInstance({'Content-Encoding': 'gzip'}).get(
        url_for('settings.get_tool_data', {
          'trans_id': transId,
        })
      );

      if (!res?.data?.success) {
        console.warn('Unable to retrieve tool content.');
        return null;
      }

      const toolData = res.data.data.result;
      const connectionInfo = toolData?.connection_info;
      const toolContent = JSON.parse(toolData.tool_data);

      let loadFile = false;
      let fileName = null;

      if(connectionInfo?.open_file_name){
        fileName = connectionInfo.open_file_name;

        if(connectionInfo.is_editor_dirty){
          if(connectionInfo.external_file_changes){
            // file has external chages
            return {loadFile: loadFile, fileName: fileName, data: toolContent, modifiedExternally: true};
          }
        }else if(connectionInfo.file_deleted){
          return {loadFile: loadFile, fileName: null, data: toolContent};
        }else{
          loadFile = true;
          return {loadFile: loadFile, fileName: fileName, data: null};
        }
      }
      return {loadFile: loadFile, fileName: fileName, data: toolContent};

    } catch (error) {
      let errorMsg = gettext(error?.response?.data?.errormsg || error);
      console.warn(errorMsg);
      return null;
    }
  }

  const deleteToolData = (panelId)=>{
    if (saveAppState && TOOLS_SUPPORTING_RESTORE.includes(panelId.split('_')[0])){
      getApiInstance().delete(
        url_for('settings.delete_application_state'), {data:{'panelId': panelId}}
      ).then(()=> { /* Sonar Qube */}).catch(function(error) {
        pgAdmin.Browser.notifier.pgRespErrorNotify(error);
      });
    }
  };

  const value = useMemo(()=>({
    saveToolData,
    isSaveToolDataEnabled,
    deleteToolData,
    getToolContent
  }), []);

  return <ApplicationStateContext.Provider value={value}>
    {children}
  </ApplicationStateContext.Provider>;

}

ApplicationStateProvider.propTypes = {
  children: PropTypes.object,
};
