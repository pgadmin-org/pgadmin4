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
  default: jest.fn(() => '/mock/url'),
}));

// Avoid pulling in everything QueryToolComponent imports.
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx', () => {
  const React = require('react');
  return {
    QueryToolContext: React.createContext(null),
    QueryToolEventsContext: React.createContext(null),
  };
});

jest.mock('../../../pgadmin/preferences/static/js/store', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getPreferencesForModule: jest.fn(() => ({})),
    setPreference: jest.fn(),
  })),
}));

jest.mock('../../../pgadmin/settings/static/ApplicationStateProvider', () => ({
  useApplicationState: () => ({
    saveToolData: jest.fn(),
    isSaveToolDataEnabled: jest.fn(() => false),
  }),
}));

import { render, act, fireEvent as fireDomEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EditorView } from '@codemirror/view';
import { withTheme } from '../fake_theme';
import EventBus from '../../../pgadmin/static/js/helpers/EventBus';
import Query from '../../../pgadmin/tools/sqleditor/static/js/components/sections/Query';
import {
  QueryToolContext, QueryToolEventsContext,
} from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx';
import { QUERY_TOOL_EVENTS } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolConstants';
import { LayoutDockerContext } from '../../../pgadmin/static/js/helpers/Layout';

const ThemedQuery = withTheme(Query);

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('Query save during close', () => {
  let eventBus;
  let queryToolCtx;
  let showModal;

  beforeEach(async () => {
    showModal = jest.fn();
    queryToolCtx = {
      params: {trans_id: 1, is_query_tool: true},
      preferences: {
        sqleditor: {prompt_save_query_changes: true},
        editor: {},
      },
      editor_disabled: false,
      api: {post: jest.fn(() => Promise.resolve({data: {data: {result: {}}}}))},
      modal: {showModal},
      keepTabInCloseBatch: jest.fn(),
    };
    eventBus = new EventBus();
    const result = render(
      <QueryToolContext.Provider value={queryToolCtx}>
        <QueryToolEventsContext.Provider value={eventBus}>
          <LayoutDockerContext.Provider value={{eventBus: new EventBus(), find: () => null}}>
            <ThemedQuery onTextSelect={() => {/* noop */}} setQtStatePartial={() => {/* noop */}} />
          </LayoutDockerContext.Provider>
        </QueryToolEventsContext.Provider>
      </QueryToolContext.Provider>
    );
    const editorView = EditorView.findFromDOM(result.container.querySelector('.cm-editor'));
    if (!editorView) {
      throw new Error('Query editor did not mount');
    }
    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.EDITOR_SET_SQL, 'SELECT 1;');
    });
    await flush();
  });

  const chooseSave = async () => {
    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.WARN_SAVE_TEXT_CLOSE);
    });
    await flush();
    const renderDialog = showModal.mock.calls[0][1];
    const Prompt = withTheme(function Prompt() {
      return renderDialog(() => {/* close */});
    });
    const dialog = render(<Prompt />);
    await act(async () => {
      fireDomEvent.click(dialog.container.querySelector('[data-test="save"]'));
    });
    await flush();
  };

  it('keeps the tab when Save As is cancelled and does not close it on a later save', async () => {
    let onCancel;
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_SAVE_FILE, (_saveAs, cancel) => {
      onCancel = cancel;
    });
    const continued = jest.fn();
    eventBus.registerListener(QUERY_TOOL_EVENTS.WARN_TXN_CLOSE, continued);

    await chooseSave();
    expect(onCancel).toEqual(expect.any(Function));

    onCancel();
    onCancel();
    expect(queryToolCtx.keepTabInCloseBatch).toHaveBeenCalledTimes(1);

    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.SAVE_FILE_DONE, '/tmp/query.sql', true);
    });
    await flush();
    expect(continued).not.toHaveBeenCalled();
    expect(queryToolCtx.keepTabInCloseBatch).toHaveBeenCalledTimes(1);
  });

  it('continues closing after the query file is saved', async () => {
    const continued = jest.fn();
    eventBus.registerListener(QUERY_TOOL_EVENTS.WARN_TXN_CLOSE, continued);

    await chooseSave();
    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.SAVE_FILE_DONE, '/tmp/query.sql', true);
    });
    await flush();

    expect(continued).toHaveBeenCalledTimes(1);
    expect(queryToolCtx.keepTabInCloseBatch).not.toHaveBeenCalled();
  });

  it('keeps the tab when saving the query file fails', async () => {
    await chooseSave();
    act(() => {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.SAVE_FILE_DONE, null, false);
    });
    await flush();

    expect(queryToolCtx.keepTabInCloseBatch).toHaveBeenCalledTimes(1);
  });
});
