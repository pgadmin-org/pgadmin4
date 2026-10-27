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

import { render, act } from '@testing-library/react';
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

const flush = () => act(async ()=> {
  await Promise.resolve();
});

describe('Query: AI Assistant insert at cursor', ()=> {
  let eventBus, editorView;

  beforeEach(()=>{
    const queryToolCtx = {
      params: {trans_id: 1, is_query_tool: true},
      preferences: {sqleditor: {}, editor: {}},
      editor_disabled: false,
      api: {post: jest.fn(()=>Promise.resolve({data: {data: {result: {}}}}))},
    };
    eventBus = new EventBus();
    const result = render(
      <QueryToolContext.Provider value={queryToolCtx}>
        <QueryToolEventsContext.Provider value={eventBus}>
          <LayoutDockerContext.Provider value={{eventBus: new EventBus(), find: ()=>null}}>
            <ThemedQuery onTextSelect={()=>{/* noop */}} setQtStatePartial={()=>{/* noop */}} />
          </LayoutDockerContext.Provider>
        </QueryToolEventsContext.Provider>
      </QueryToolContext.Provider>
    );
    editorView = EditorView.findFromDOM(result.container.querySelector('.cm-editor'));
    if (!editorView) {
      throw new Error('Query editor did not mount');
    }
  });

  const setQuery = async (query, selection)=>{
    act(()=> {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.EDITOR_SET_SQL, query);
    });
    await flush();
    act(()=> {
      editorView.dispatch({selection: selection});
    });
  };

  const insertSQL = async (sql)=>{
    act(()=> {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.NLQ_INSERT_SQL, sql);
    });
    await flush();
  };

  it('inserts the returned SQL at the cursor, leaving the text after the cursor in place', async ()=>{
    const query = 'SELECT * FROM public.actor;\n-- run it next';
    const added = ' WHERE actor_id = 1';
    await setQuery(query, {anchor: query.indexOf(';')});

    await insertSQL(added);

    expect(editorView.state.doc.toString())
      .toBe('SELECT * FROM public.actor WHERE actor_id = 1;\n-- run it next');
    expect(editorView.state.selection.main.empty).toBe(true);
    expect(editorView.state.selection.main.head).toBe(query.indexOf(';') + added.length);
  });

  it('replaces the selected text and leaves the caret after the inserted SQL', async ()=>{
    const query = 'SELECT * FROM public.actor;';
    const from = query.indexOf('public.actor');
    await setQuery(query, {anchor: from, head: from + 'public.actor'.length});

    await insertSQL('public.film');

    expect(editorView.state.doc.toString()).toBe('SELECT * FROM public.film;');
    expect(editorView.state.selection.main.empty).toBe(true);
    expect(editorView.state.selection.main.head).toBe(from + 'public.film'.length);
  });

  it('ignores an empty SQL block instead of deleting the selection', async ()=>{
    const query = 'SELECT * FROM public.actor;';
    const from = query.indexOf('public.actor');
    await setQuery(query, {anchor: from, head: from + 'public.actor'.length});

    await insertSQL('');

    expect(editorView.state.doc.toString()).toBe(query);
  });
});
