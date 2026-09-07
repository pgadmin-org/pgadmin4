/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { BROWSER_PANELS, SHOW_OBJECT_EXPLORER_EVENT,
  TOGGLE_OBJECT_EXPLORER_EVENT, WORKSPACES }
  from '../../../../browser/static/js/constants';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';
import usePreferences from '../../../../preferences/static/js/store';
import getApiInstance from '../../../../static/js/api_instance';
import url_for from 'sources/url_for';
import { config } from './config';

const WorkspaceContext = React.createContext();
const OBJECT_EXPLORER_VISIBLE_SETTING = 'Browser/ObjectExplorerVisible';

// Serialize visibility writes so overlapping store requests cannot apply out of order.
let objectExplorerPersistChain = Promise.resolve();

export const useWorkspace = ()=>useContext(WorkspaceContext);

function getSavedObjectExplorerVisible(pgAdmin) {
  const saved = pgAdmin?.Browser?.utils?.layout?.[OBJECT_EXPLORER_VISIBLE_SETTING];
  if (saved === undefined || saved === null || saved === '') {
    return true;
  }
  return saved === true || saved === 'true';
}

function persistObjectExplorerVisible(pgAdmin, visible) {
  if (pgAdmin?.Browser?.utils?.layout) {
    pgAdmin.Browser.utils.layout[OBJECT_EXPLORER_VISIBLE_SETTING] = String(visible);
  }
  const formData = new FormData();
  formData.append('setting', OBJECT_EXPLORER_VISIBLE_SETTING);
  formData.append('value', String(visible));
  objectExplorerPersistChain = objectExplorerPersistChain
    .catch(()=>{/* The previous write failed and has already been logged. */})
    .then(()=>getApiInstance().post(url_for('settings.store_bulk'), formData))
    .catch((error)=>{
      // Not worth interrupting the user for, but silence would leave the
      // sidebar disagreeing with the server after the next refresh with no
      // way to tell why.
      console.warn('Unable to save the Object Explorer visibility setting.',
        error);
    });
}

export function WorkspaceProvider({children}) {
  const pgAdmin = usePgAdmin();
  const [currentWorkspace, setCurrentWorkspace] = useState(WORKSPACES.DEFAULT);
  const [isObjectExplorerVisible, setIsObjectExplorerVisible] = useState(
    () => getSavedObjectExplorerVisible(pgAdmin)
  );
  const lastSelectedTreeItem = useRef();
  // Keep latest visibility for consecutive toggles before React re-renders.
  const isObjectExplorerVisibleRef = useRef(isObjectExplorerVisible);
  isObjectExplorerVisibleRef.current = isObjectExplorerVisible;
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

  pgAdmin.Browser.getDockerHandler = (panelId, classicDocker)=>{
    let docker;
    let workspace;
    if (isClassic) {
      return {
        docker: classicDocker,
        focus: ()=>{},
      };
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
        pgAdmin.Browser.tree?.selectNode(lastSelectedTreeItem.current, true, 'center');
        lastSelectedTreeItem.current = null;
      }, 250);
    }  else {
      // Get the selected tree node and save it into the state variable.
      let selItem = pgAdmin.Browser.tree?.selected();
      if (selItem)
        lastSelectedTreeItem.current = selItem;
      // Deselect the node to disable the menu options.
      pgAdmin.Browser.tree?.deselect(selItem);
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

  const setObjectExplorerVisible = useCallback((visible)=>{
    isObjectExplorerVisibleRef.current = visible;
    setIsObjectExplorerVisible(visible);
    persistObjectExplorerVisible(pgAdmin, visible);
  }, [pgAdmin]);

  const toggleObjectExplorer = useCallback(()=>{
    setObjectExplorerVisible(!isObjectExplorerVisibleRef.current);
  }, [setObjectExplorerVisible]);

  useEffect(()=>{
    // Code outside React, e.g. the shortcut that focuses the tree, asks for
    // the panel this way rather than reaching into this state.
    return pgAdmin.Browser.Events.registerListener(
      SHOW_OBJECT_EXPLORER_EVENT, ()=>setObjectExplorerVisible(true));
  }, [pgAdmin, setObjectExplorerVisible]);

  useEffect(()=>{
    // Classic layout has no workspace toolbar and always shows the Object
    // Explorer, so the shortcut has nothing to collapse there.
    if(isClassic) return;

    return pgAdmin.Browser.Events.registerListener(
      TOGGLE_OBJECT_EXPLORER_EVENT, toggleObjectExplorer);
  }, [pgAdmin, isClassic, toggleObjectExplorer]);

  const value = useMemo(()=>({
    config: config,
    currentWorkspace: currentWorkspace,
    enabled: !isClassic,
    changeWorkspace,
    hasOpenTabs,
    getLayoutObj,
    onWorkspaceDisabled,
    isObjectExplorerVisible,
    setObjectExplorerVisible,
    toggleObjectExplorer,
  }), [currentWorkspace, isClassic, isObjectExplorerVisible, setObjectExplorerVisible, toggleObjectExplorer]);

  return <WorkspaceContext.Provider value={value}>
    {children}
  </WorkspaceContext.Provider>;
}

WorkspaceProvider.propTypes = {
  children: PropTypes.array
};
