/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import { BROWSER_PANELS, WORKSPACES } from '../../../../browser/static/js/constants';
import WorkspaceWelcomePage from './WorkspaceWelcomePage';
import React from 'react';

const welcomeQueryToolPanelData = {
  id: BROWSER_PANELS.WELCOME_QUERY_TOOL, title: gettext('Welcome'), content: <WorkspaceWelcomePage mode={WORKSPACES.QUERY_TOOL} />, closable: false, group: 'playground'
};

const welcomePSQLPanelData = {
  id: BROWSER_PANELS.WELCOME_PSQL_TOOL, title: gettext('Welcome'), content: <WorkspaceWelcomePage mode={WORKSPACES.PSQL_TOOL} />, closable: false, group: 'playground'
};

export const config = [
  {
    docker: 'query_tool_workspace',
    panel: BROWSER_PANELS.QUERY_TOOL,
    workspace: WORKSPACES.QUERY_TOOL,
    layout: {
      dockbox: {
        mode: 'vertical',
        children: [
          {
            mode: 'horizontal',
            children: [
              {
                size: 100,
                id: BROWSER_PANELS.MAIN,
                group: 'playground',
                tabs: [welcomeQueryToolPanelData],
                panelLock: {panelStyle: 'playground'},
              }
            ]
          },
        ]
      }
    }
  },
  {
    docker: 'psql_workspace',
    panel: BROWSER_PANELS.PSQL_TOOL,
    workspace: WORKSPACES.PSQL_TOOL,
    layout: {
      dockbox: {
        mode: 'vertical',
        children: [
          {
            mode: 'horizontal',
            children: [
              {
                size: 100,
                id: BROWSER_PANELS.MAIN,
                group: 'playground',
                tabs: [welcomePSQLPanelData],
                panelLock: {panelStyle: 'playground'},
              }
            ]
          },
        ]
      }
    }
  },
  {
    docker: 'schema_diff_workspace',
    panel: BROWSER_PANELS.SCHEMA_DIFF_TOOL,
    workspace: WORKSPACES.SCHEMA_DIFF_TOOL,
    layout: {
      dockbox: {
        mode: 'vertical',
        children: [
          {
            mode: 'horizontal',
            children: [
              {
                size: 100,
                id: BROWSER_PANELS.MAIN,
                group: 'playground',
                tabs: [],
                panelLock: {panelStyle: 'playground'},
              }
            ]
          },
        ]
      }
    }
  },
];
