/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

jest.mock('sources/url_for', () => ({
  __esModule: true,
  default: jest.fn((endpoint, args) => `/mock/${endpoint}/${args?.trans_id}`),
}));

// Avoid pulling in everything QueryToolComponent imports.
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx', () => {
  const React = require('react');
  return {
    QueryToolContext: React.createContext(null),
    QueryToolConnectionContext: React.createContext(null),
    QueryToolEventsContext: React.createContext(null),
  };
});

const mockIsSaveToolDataEnabled = jest.fn(() => true);
jest.mock('../../../pgadmin/settings/static/ApplicationStateProvider', () => ({
  useApplicationState: () => ({isSaveToolDataEnabled: mockIsSaveToolDataEnabled}),
}));

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { withTheme } from '../fake_theme';
import EventBus from '../../../pgadmin/static/js/helpers/EventBus';
import {
  MainToolBar, getRestorableToolbarOptions, getChangedExecutionOptions,
} from '../../../pgadmin/tools/sqleditor/static/js/components/sections/MainToolBar';
import {
  QueryToolContext, QueryToolConnectionContext, QueryToolEventsContext,
} from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx';
import { QUERY_TOOL_EVENTS } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolConstants';

const sqleditorPrefs = {
  auto_commit: true,
  auto_rollback: false,
  server_cursor: false,
  open_in_new_tab: false,
  explain_verbose: false,
  explain_costs: false,
  explain_buffers: false,
  explain_timing: false,
  explain_summary: false,
  explain_settings: false,
  explain_wal: false,
  explain_generic_plan: false,
  explain_memory: false,
};

describe('getRestorableToolbarOptions', () => {
  it('keeps only known options with boolean values', () => {
    expect(getRestorableToolbarOptions({
      auto_commit: false,
      open_in_new_tab: true,
      explain_verbose: 'yes',
      unknown_option: true,
    })).toEqual({auto_commit: false, open_in_new_tab: true});
  });

  it('copes with missing saved options', () => {
    expect(getRestorableToolbarOptions(undefined)).toEqual({});
    expect(getRestorableToolbarOptions(null)).toEqual({});
  });
});

describe('getChangedExecutionOptions', () => {
  it('returns only the execute options that differ', () => {
    expect(getChangedExecutionOptions(
      {auto_commit: false, auto_rollback: false, server_cursor: true, open_in_new_tab: true},
      {auto_commit: true, auto_rollback: false, server_cursor: false},
    )).toEqual({auto_commit: false, server_cursor: true});
  });
});

describe('MainToolBar toolbar options restore', () => {
  let eventBus, queryToolCtx;
  const ThemedMainToolBar = withTheme(MainToolBar);

  const renderToolBar = (connected, isQueryTool=true) => {
    const containerRef = React.createRef();
    const ui = (conn) => (
      <QueryToolContext.Provider value={queryToolCtx}>
        <QueryToolConnectionContext.Provider value={{connected: conn, obtainingConn: false, connectionStatus: null}}>
          <QueryToolEventsContext.Provider value={eventBus}>
            <div ref={containerRef}>
              <ThemedMainToolBar containerRef={containerRef} onFilterClick={()=>{/* noop */}}
                onManageMacros={()=>{/* noop */}} onAddToMacros={()=>{/* noop */}} />
            </div>
          </QueryToolEventsContext.Provider>
        </QueryToolConnectionContext.Provider>
      </QueryToolContext.Provider>
    );
    queryToolCtx.params.is_query_tool = isQueryTool;
    const result = render(ui(connected));
    return {...result, setConnected: (conn) => result.rerender(ui(conn))};
  };

  beforeEach(() => {
    eventBus = new EventBus();
    queryToolCtx = {
      params: {trans_id: 1234, is_query_tool: true, macros: []},
      preferences: {sqleditor: {...sqleditorPrefs}, editor: {}},
      api: {post: jest.fn(() => Promise.resolve({data: {}}))},
      modal: {},
      toolbarOptionsRef: {current: null},
      updateServerCursor: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('publishes the current options for saving with the tab state', async () => {
    renderToolBar(true);
    await waitFor(() => {
      expect(queryToolCtx.toolbarOptionsRef.current).toEqual(expect.objectContaining({
        auto_commit: true, open_in_new_tab: false,
      }));
    });
  });

  it('restores saved options and applies changed execute options once connected', async () => {
    const {setConnected} = renderToolBar(false);
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());

    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.RESTORE_TOOLBAR_OPTIONS, {
        auto_commit: false,
        auto_rollback: false,
        server_cursor: true,
        open_in_new_tab: true,
        explain_verbose: true,
      });
    });

    await waitFor(() => {
      expect(queryToolCtx.toolbarOptionsRef.current).toEqual(expect.objectContaining({
        auto_commit: false, server_cursor: true, open_in_new_tab: true, explain_verbose: true,
      }));
    });
    expect(queryToolCtx.updateServerCursor).toHaveBeenCalledWith({server_cursor: true});
    // Nothing can be sent to the server until the transaction exists.
    expect(queryToolCtx.api.post).not.toHaveBeenCalled();

    setConnected(true);
    await waitFor(() => expect(queryToolCtx.api.post).toHaveBeenCalledTimes(2));
    expect(queryToolCtx.api.post).toHaveBeenCalledWith('/mock/sqleditor.auto_commit/1234', 'false');
    expect(queryToolCtx.api.post).toHaveBeenCalledWith('/mock/sqleditor.server_cursor/1234', 'true');
  });

  it('does not restore execute options for View/Edit Data', async () => {
    renderToolBar(true, false);
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());

    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.RESTORE_TOOLBAR_OPTIONS, {
        auto_commit: false, explain_costs: true,
      });
    });

    await waitFor(() => {
      expect(queryToolCtx.toolbarOptionsRef.current).toEqual(expect.objectContaining({
        auto_commit: true, explain_costs: true,
      }));
    });
    expect(queryToolCtx.api.post).not.toHaveBeenCalled();
  });
});
