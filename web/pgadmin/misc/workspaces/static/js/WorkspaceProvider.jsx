/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { BROWSER_PANELS, WORKSPACES } from '../../../../browser/static/js/constants';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';
import usePreferences from '../../../../preferences/static/js/store';
import { config } from './config';

const WorkspaceContext = React.createContext();

export const useWorkspace = ()=>useContext(WorkspaceContext);

export function WorkspaceProvider({children}) {
  const pgAdmin = usePgAdmin();
  const [currentWorkspace, setCurrentWorkspace] = useState(WORKSPACES.DEFAULT);
  const lastSelectedTreeItem = useRef();
  const isClassic = (usePreferences()?.getPreferencesForModule('misc')?.layout ?? 'classic') == 'classic';
  const openInResWorkspace = usePreferences()?.getPreferencesForModule('misc')?.open_in_res_workspace && !isClassic;

  if (_.isUndefined(pgAdmin.Browser.docker.currentWorkspace)) {
    pgAdmin.Browser.docker.currentWorkspace = WORKSPACES.DEFAULT;
  }
  /* In case of classic UI all workspace objects should point to the
  * the instance of the default layout.
  */
  if (isClassic && pgAdmin.Browser.docker.default_workspace) {
    pgAdmin.Browser.docker.query_tool_workspace = pgAdmin.Browser.docker.default_workspace;
    pgAdmin.Browser.docker.psql_workspace = pgAdmin.Browser.docker.default_workspace;
    pgAdmin.Browser.docker.schema_diff_workspace = pgAdmin.Browser.docker.default_workspace;
  }

  pgAdmin.Browser.getDockerHandler = (panelId)=>{
    let docker;
    let workspace;
    if (isClassic) {
      return undefined;
    }

    const wsConfig = config.find((i)=>panelId.indexOf(i.panel)>=0);
    if (wsConfig) {
      docker = pgAdmin.Browser.docker[wsConfig.docker];
      workspace = wsConfig.workspace;
    } else {
      docker = pgAdmin.Browser.docker.default_workspace;
      workspace = WORKSPACES.DEFAULT;
    }

    // If the layout is Workspace layout and 'Open the Query Tool/PSQL in their respective workspaces'
    // is False then check the current workspace and set the workspace and docker accordingly.
    if (!openInResWorkspace && pgAdmin.Browser.docker.currentWorkspace == WORKSPACES.DEFAULT &&
      (panelId.indexOf(BROWSER_PANELS.QUERY_TOOL) >= 0 || panelId.indexOf(BROWSER_PANELS.PSQL_TOOL) >= 0)) {
      docker = pgAdmin.Browser.docker.default_workspace;
      workspace = WORKSPACES.DEFAULT;
    }

    // Call onWorkspaceChange to enable or disable the menu based on the selected workspace.
    changeWorkspace(workspace);
    return {docker: docker, focus: ()=>changeWorkspace(workspace)};
  };

  const changeWorkspace = (newVal)=>{
    // Set the currentWorkspace flag.
    if (currentWorkspace == newVal) return;
    pgAdmin.Browser.docker.currentWorkspace = newVal;
    if (newVal == WORKSPACES.DEFAULT) {
      setTimeout(() => {
        pgAdmin.Browser.tree.selectNode(lastSelectedTreeItem.current);
        lastSelectedTreeItem.current = null;
      }, 0);
    }  else {
      // Get the selected tree node and save it into the state variable.
      let selItem = pgAdmin.Browser.tree.selected();
      if (selItem)
        lastSelectedTreeItem.current = selItem;
      // Deselect the node to disable the menu options.
      pgAdmin.Browser.tree.deselect(selItem);
    }
    setCurrentWorkspace(newVal);
  };

  const hasOpenTabs = (forWs)=>{
    const wsConfig = config.find((i)=>i.workspace == forWs);
    // If enableOnNoTabs is set and it is true then no need to check for tabs.
    if (wsConfig?.enableOnNoTabs) {
      return true;
    }
    
    if(wsConfig) {
      return Boolean(pgAdmin.Browser.docker[wsConfig.docker]?.layoutObj?.getLayout()?.dockbox?.children?.[0]?.tabs?.length);
    }
    return true;
  };

  const getLayoutObj = (forWs)=>{
    const wsConfig = config.find((i)=>i.workspace == forWs);
    if(wsConfig) {
      return pgAdmin.Browser.docker[wsConfig.docker];
    }
    return pgAdmin.Browser.docker.default_workspace;
  };

  const onWorkspaceDisabled = ()=>{
    changeWorkspace(WORKSPACES.DEFAULT);
  };

  const value = useMemo(()=>({
    config: config,
    currentWorkspace: currentWorkspace,
    enabled: !isClassic,
    changeWorkspace,
    hasOpenTabs,
    getLayoutObj,
    onWorkspaceDisabled
  }), [currentWorkspace, isClassic]);

  return <WorkspaceContext.Provider value={value}>
    {children}
  </WorkspaceContext.Provider>;
}

WorkspaceProvider.propTypes = {
  children: PropTypes.array
};
