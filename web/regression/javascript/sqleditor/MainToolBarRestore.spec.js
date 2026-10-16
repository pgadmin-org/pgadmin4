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
import { render, act, waitFor, fireEvent as fireDomEvent } from '@testing-library/react';
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
    return {
      ...result,
      setConnected: (conn, ctx) => {
        if(ctx) {
          queryToolCtx = ctx;
        }
        result.rerender(ui(conn));
      },
    };
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
    // Execution must stay possible, as it is what re-makes a failed connection.
    expectGated(false);

    setConnected(true);
    await waitFor(() => expect(queryToolCtx.api.post).toHaveBeenCalledTimes(2));
    expect(queryToolCtx.api.post).toHaveBeenCalledWith('/mock/sqleditor.auto_commit/1234', 'false');
    expect(queryToolCtx.api.post).toHaveBeenCalledWith('/mock/sqleditor.server_cursor/1234', 'true');
  });

  it('sends restored execute options to the transaction current when connected', async () => {
    const {setConnected} = renderToolBar(false);
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());

    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.RESTORE_TOOLBAR_OPTIONS, {auto_commit: false});
    });
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current.auto_commit).toBe(false));

    // The transaction is replaced before the pending option is sent.
    setConnected(true, {...queryToolCtx, params: {...queryToolCtx.params, trans_id: 5678}});
    await waitFor(() => expect(queryToolCtx.api.post).toHaveBeenCalledTimes(1));
    expect(queryToolCtx.api.post).toHaveBeenCalledWith('/mock/sqleditor.auto_commit/5678', 'false');
  });

  it('reverts and saves a restored execute option the server rejects', async () => {
    queryToolCtx.api.post = jest.fn(() => Promise.reject(new Error('failed')));
    const fireEvent = jest.spyOn(eventBus, 'fireEvent');
    renderToolBar(true);
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());

    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.RESTORE_TOOLBAR_OPTIONS, {auto_commit: false});
    });

    await waitFor(() => {
      expect(fireEvent).toHaveBeenCalledWith(QUERY_TOOL_EVENTS.TRIGGER_SAVE_QUERY_TOOL_DATA);
    });
    await waitFor(() => {
      expect(queryToolCtx.toolbarOptionsRef.current.auto_commit).toBe(true);
    });
    fireEvent.mockRestore();
  });

  // A disabled button loses its accessible name to a wrapping span.
  const gatedButtons = () => ['Execute script', 'Execute query', 'Execute options', 'Explain', 'Explain Analyze']
    .map((label) => document.querySelector(`button[data-label="${label}"]`));
  const expectGated = (disabled) => {
    gatedButtons().forEach((btn) => {
      if(disabled) {
        expect(btn).toBeDisabled();
      } else {
        expect(btn).toBeEnabled();
      }
    });
  };

  it('keeps execution disabled until restored execute options are applied', async () => {
    const resolvers = [];
    queryToolCtx.api.post = jest.fn(() => new Promise((resolve) => { resolvers.push(resolve); }));
    renderToolBar(true);
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());
    expectGated(false);

    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.RESTORE_TOOLBAR_OPTIONS, {auto_commit: false, auto_rollback: true});
    });
    await waitFor(() => expect(queryToolCtx.api.post).toHaveBeenCalledTimes(1));
    await waitFor(() => expectGated(true));

    // Still disabled until every option has reached the server, and the
    // options are sent one at a time.
    await act(async () => { resolvers[0]({data: {}}); });
    await waitFor(() => expect(queryToolCtx.api.post).toHaveBeenCalledTimes(2));
    expectGated(true);

    await act(async () => { resolvers[1]({data: {}}); });
    await waitFor(() => expectGated(false));
  });

  it('ignores the execute shortcut until restored execute options are applied', async () => {
    let resolvePost;
    queryToolCtx.api.post = jest.fn(() => new Promise((resolve) => { resolvePost = resolve; }));
    // F5
    queryToolCtx.preferences.sqleditor.execute_script = {
      alt: false, shift: false, control: false, key: {key_code: 116},
    };
    const triggered = jest.fn();
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION, triggered);
    const {container} = renderToolBar(true);
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());

    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.RESTORE_TOOLBAR_OPTIONS, {auto_commit: false});
    });
    await waitFor(() => expectGated(true));
    await act(async () => { fireDomEvent.keyDown(container.firstChild, {keyCode: 116}); });
    expect(triggered).not.toHaveBeenCalled();

    await act(async () => { resolvePost({data: {}}); });
    await waitFor(() => expectGated(false));
    await act(async () => { fireDomEvent.keyDown(container.firstChild, {keyCode: 116}); });
    await waitFor(() => expect(triggered).toHaveBeenCalledTimes(1));
  });

  it('ignores macros until restored execute options are applied', async () => {
    let resolvePost;
    queryToolCtx.api.post = jest.fn(() => new Promise((resolve) => { resolvePost = resolve; }));
    // F6
    queryToolCtx.params.macros = [{
      id: 1, name: 'Test macro', sql: 'SELECT 1;',
      alt: false, shift: false, control: false, key: 'F6', key_code: 117,
    }];
    const triggered = jest.fn();
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION, triggered);
    const {container} = renderToolBar(true);
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());
    const macrosButton = () => document.querySelector('button[data-label="Macros"]');
    expect(macrosButton()).toBeEnabled();

    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.RESTORE_TOOLBAR_OPTIONS, {auto_commit: false});
    });
    await waitFor(() => expectGated(true));
    expect(macrosButton()).toBeDisabled();
    await act(async () => { fireDomEvent.keyDown(container.firstChild, {keyCode: 117}); });
    expect(triggered).not.toHaveBeenCalled();

    await act(async () => { resolvePost({data: {}}); });
    await waitFor(() => expectGated(false));
    expect(macrosButton()).toBeEnabled();
    await act(async () => { fireDomEvent.keyDown(container.firstChild, {keyCode: 117}); });
    await waitFor(() => expect(triggered).toHaveBeenCalledWith(null, 'SELECT 1;'));
  });

  it('enables execution again when a restored execute option fails', async () => {
    let rejectPost;
    queryToolCtx.api.post = jest.fn(() => new Promise((_resolve, reject) => { rejectPost = reject; }));
    renderToolBar(true);
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());

    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.RESTORE_TOOLBAR_OPTIONS, {auto_commit: false});
    });
    await waitFor(() => expectGated(true));

    await act(async () => { rejectPost(new Error('failed')); });
    await waitFor(() => expectGated(false));
    expect(queryToolCtx.toolbarOptionsRef.current.auto_commit).toBe(true);
  });

  it('enables execution again if sending a restored execute option throws', async () => {
    queryToolCtx.api.post = jest.fn(() => { throw new Error('failed'); });
    renderToolBar(true);
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());

    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.RESTORE_TOOLBAR_OPTIONS, {auto_commit: false});
    });
    await waitFor(() => expect(queryToolCtx.api.post).toHaveBeenCalled());
    await waitFor(() => expectGated(false));
    expect(queryToolCtx.toolbarOptionsRef.current.auto_commit).toBe(true);
  });

  it('does not disable execution when no execute options need restoring', async () => {
    renderToolBar(true);
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());

    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.RESTORE_TOOLBAR_OPTIONS, {auto_commit: true, explain_costs: true});
    });
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current.explain_costs).toBe(true));
    expectGated(false);
    expect(queryToolCtx.api.post).not.toHaveBeenCalled();
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

describe('MainToolBar execute options menu', () => {
  let eventBus, queryToolCtx;
  const ThemedMainToolBar = withTheme(MainToolBar);

  const renderToolBar = () => {
    const containerRef = React.createRef();
    const ui = (ctx) => (
      <QueryToolContext.Provider value={ctx}>
        <QueryToolConnectionContext.Provider value={{connected: true, obtainingConn: false, connectionStatus: null}}>
          <QueryToolEventsContext.Provider value={eventBus}>
            <div ref={containerRef}>
              <ThemedMainToolBar containerRef={containerRef} onFilterClick={()=>{/* noop */}}
                onManageMacros={()=>{/* noop */}} onAddToMacros={()=>{/* noop */}} />
            </div>
          </QueryToolEventsContext.Provider>
        </QueryToolConnectionContext.Provider>
      </QueryToolContext.Provider>
    );
    const result = render(ui(queryToolCtx));
    return {...result, setContext: (ctx) => result.rerender(ui(ctx))};
  };

  const menuItem = (label) => document.querySelector(`li[data-label="${label}"]`);

  const openMenuAndClick = async (label) => {
    if(!menuItem(label)) {
      await act(async () => {
        fireDomEvent.click(document.querySelector('button[data-label="Execute options"]'));
      });
      await waitFor(() => expect(menuItem(label)).not.toBeNull());
    }
    await act(async () => { fireDomEvent.click(menuItem(label)); });
  };

  beforeEach(() => {
    eventBus = new EventBus();
    queryToolCtx = {
      params: {trans_id: 1234, is_query_tool: true, macros: []},
      preferences: {sqleditor: {...sqleditorPrefs}, editor: {}},
      api: {post: jest.fn(() => Promise.resolve({data: {data: {status: true}}}))},
      modal: {},
      toolbarOptionsRef: {current: null},
      updateServerCursor: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sends a changed execute option to the server', async () => {
    renderToolBar();
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());

    await openMenuAndClick('Use server cursor?');
    await waitFor(() => expect(queryToolCtx.api.post).toHaveBeenCalledWith('/mock/sqleditor.server_cursor/1234', 'true'));
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current.server_cursor).toBe(true));
    expect(queryToolCtx.updateServerCursor).toHaveBeenLastCalledWith({server_cursor: true});
  });

  it('sends execute options to the current transaction after a connection change', async () => {
    const {setContext} = renderToolBar();
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());

    // A connection change replaces the transaction with a new one.
    const newCtx = {
      ...queryToolCtx,
      params: {...queryToolCtx.params, trans_id: 5678},
      updateServerCursor: jest.fn(),
    };
    setContext(newCtx);

    await openMenuAndClick('Use server cursor?');
    await waitFor(() => expect(queryToolCtx.api.post).toHaveBeenCalledWith('/mock/sqleditor.server_cursor/5678', 'true'));
    expect(queryToolCtx.api.post).not.toHaveBeenCalledWith('/mock/sqleditor.server_cursor/1234', expect.anything());
    expect(newCtx.updateServerCursor).toHaveBeenLastCalledWith({server_cursor: true});
    expect(queryToolCtx.updateServerCursor).not.toHaveBeenCalled();
  });

  it('reverts an execute option when the request fails', async () => {
    queryToolCtx.api.post = jest.fn(() => Promise.reject(new Error('failed')));
    const fireEvent = jest.spyOn(eventBus, 'fireEvent');
    renderToolBar();
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());

    await openMenuAndClick('Use server cursor?');
    await waitFor(() => {
      expect(fireEvent).toHaveBeenCalledWith(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, expect.any(Error), {checkTransaction: true});
    });
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current.server_cursor).toBe(false));
    expect(queryToolCtx.updateServerCursor).toHaveBeenLastCalledWith({server_cursor: false});
    expect(menuItem('Use server cursor?')).toHaveAttribute('data-checked', 'false');
    fireEvent.mockRestore();
  });

  it('reverts an execute option when the server returns status false', async () => {
    queryToolCtx.api.post = jest.fn(() => Promise.resolve({data: {data: {status: false, result: 'Not connected'}}}));
    const fireEvent = jest.spyOn(eventBus, 'fireEvent');
    renderToolBar();
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());

    await openMenuAndClick('Auto commit?');
    await waitFor(() => {
      expect(fireEvent).toHaveBeenCalledWith(QUERY_TOOL_EVENTS.HANDLE_API_ERROR,
        expect.objectContaining({message: 'Not connected'}), {checkTransaction: true});
    });
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current.auto_commit).toBe(true));
    fireEvent.mockRestore();
  });

  it('disables the execute options whilst a change is being sent', async () => {
    let resolvePost;
    queryToolCtx.api.post = jest.fn(() => new Promise((resolve) => { resolvePost = resolve; }));
    renderToolBar();
    await waitFor(() => expect(queryToolCtx.toolbarOptionsRef.current).not.toBeNull());

    await openMenuAndClick('Auto commit?');
    await waitFor(() => expect(queryToolCtx.api.post).toHaveBeenCalledTimes(1));
    ['Auto commit?', 'Auto rollback on error?', 'Use server cursor?'].forEach((label) => {
      expect(menuItem(label)).toHaveAttribute('aria-disabled', 'true');
    });

    // A click whilst the request is in flight is ignored.
    await act(async () => { fireDomEvent.click(menuItem('Auto rollback on error?')); });
    expect(queryToolCtx.api.post).toHaveBeenCalledTimes(1);

    await act(async () => { resolvePost({data: {data: {status: true}}}); });
    await waitFor(() => expect(menuItem('Auto rollback on error?')).not.toHaveAttribute('aria-disabled', 'true'));
    expect(queryToolCtx.toolbarOptionsRef.current.auto_commit).toBe(false);
    expect(queryToolCtx.toolbarOptionsRef.current.auto_rollback).toBe(false);
  });
});
