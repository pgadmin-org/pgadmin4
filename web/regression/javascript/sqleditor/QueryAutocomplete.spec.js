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

import { EditorState } from '@codemirror/state';
import { startCompletion } from '@codemirror/autocomplete';
import CustomEditorView from 'sources/components/ReactCodeMirror/CustomEditorView';
import { autoCompleteCompartment } from 'sources/components/ReactCodeMirror/extensions/extraStates';
import {
  registerAutocomplete, AUTOCOMPLETE_DEBOUNCE_MS,
} from '../../../pgadmin/tools/sqleditor/static/js/components/sections/Query';

// A stand-in for the CodeMirror CompletionContext: it only has the parts that
// the completion source uses.
function fakeContext({explicit = false, doc = 'SEL'} = {}) {
  const listeners = {};
  return {
    explicit,
    state: {
      doc: {toString: () => doc},
      sliceDoc: (from, to) => doc.slice(from, to),
      selection: {main: {head: doc.length}},
    },
    matchBefore: () => ({from: 0}),
    addEventListener: jest.fn((type, cb) => { listeners[type] = cb; }),
    abort: () => listeners.abort?.(),
  };
}

// Registers the source on a fake editor and returns it, as the editor would call it.
function setup(api) {
  const editor = {registerAutocomplete: jest.fn()};
  registerAutocomplete(editor, api, 1);
  return editor.registerAutocomplete.mock.calls[0][0];
}

const apiReturning = (result) => ({
  post: jest.fn(() => Promise.resolve({data: {data: {result}}})),
});

// An api whose requests never finish unless they are aborted.
const pendingApi = () => ({
  post: jest.fn((url, body, config) => new Promise((_, reject) => {
    config?.signal?.addEventListener('abort', () => reject(new Error('canceled')));
  })),
});

describe('Query autocomplete source', () => {
  it('asks CodeMirror to debounce typing by AUTOCOMPLETE_DEBOUNCE_MS', () => {
    const editor = {registerAutocomplete: jest.fn()};
    registerAutocomplete(editor, apiReturning({}), 1);
    expect(editor.registerAutocomplete).toHaveBeenCalledWith(
      expect.any(Function), {activateOnTypingDelay: AUTOCOMPLETE_DEBOUNCE_MS}
    );
  });

  it('returns the suggestions from the server', async () => {
    const api = apiReturning({select: {object_type: 'keyword'}});
    const onAvailable = jest.fn();

    const res = await setup(api)(fakeContext(), onAvailable);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(res.options).toEqual([{label: 'select', type: 'keyword'}]);
    expect(onAvailable).toHaveBeenCalled();
  });

  it('cancels the request in flight when the query is aborted', async () => {
    const api = pendingApi();
    const ctx = fakeContext();
    const promise = setup(api)(ctx, jest.fn());
    const signal = api.post.mock.calls[0][2]?.signal;
    expect(signal?.aborted).toBe(false);

    ctx.abort();
    expect(signal?.aborted).toBe(true);
    await expect(promise).resolves.toBeNull();
  });

  it('still reports a server error that was not caused by an abort', async () => {
    const api = {post: jest.fn(() => Promise.reject(new Error('boom')))};
    const onAvailable = jest.fn();

    const promise = setup(api)(fakeContext({explicit: true}), onAvailable);
    await expect(promise).rejects.toThrow('boom');
    expect(onAvailable).toHaveBeenCalled();
  });

  it('asks CodeMirror to abort the query when the document changes', () => {
    const ctx = fakeContext({explicit: true});
    setup(apiReturning({}))(ctx, jest.fn());
    expect(ctx.addEventListener).toHaveBeenCalledWith(
      'abort', expect.any(Function), {onDocChange: true}
    );
  });
});

// The same source wired into a real editor, to check when CodeMirror
// actually sends requests.
describe('Query autocomplete in the editor', () => {
  let view;

  function createEditor(api) {
    view = new CustomEditorView({
      state: EditorState.create({extensions: [autoCompleteCompartment.of([])]}),
      parent: document.body,
    });
    // jsdom has no layout; the loading indicator only needs a position.
    view.coordsAtPos = () => ({top: 0, bottom: 0, left: 0, right: 0});
    registerAutocomplete(view, api, 1);
  }

  const type = (text) => {
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: {from: pos, insert: text},
      selection: {anchor: pos + text.length},
      userEvent: 'input.type',
    });
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    view?.destroy();
    view = null;
    jest.useRealTimers();
  });

  it('waits until typing pauses for the debounce delay', () => {
    const api = pendingApi();
    createEditor(api);

    for (const ch of 'select') {
      type(ch);
      jest.advanceTimersByTime(AUTOCOMPLETE_DEBOUNCE_MS - 50);
    }
    expect(api.post).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('answers Ctrl+Space right away', () => {
    const api = pendingApi();
    createEditor(api);

    startCompletion(view);
    jest.advanceTimersByTime(100);
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('answers Ctrl+Space pressed while a typing delay is pending', () => {
    const api = pendingApi();
    createEditor(api);

    type('s');
    jest.advanceTimersByTime(AUTOCOMPLETE_DEBOUNCE_MS / 2);
    expect(api.post).not.toHaveBeenCalled();

    startCompletion(view);
    jest.advanceTimersByTime(100);
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('keeps debouncing typing after an explicit request', () => {
    const api = pendingApi();
    createEditor(api);

    type('s');
    startCompletion(view);
    jest.advanceTimersByTime(100);
    expect(api.post).toHaveBeenCalledTimes(1);
    const firstSignal = api.post.mock.calls[0][2].signal;

    // Keep typing while that request is still pending: it is cancelled, and
    // no new request is sent until typing pauses.
    for (const ch of 'elect') {
      type(ch);
      jest.advanceTimersByTime(AUTOCOMPLETE_DEBOUNCE_MS - 50);
    }
    expect(firstSignal.aborted).toBe(true);
    expect(api.post).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(50);
    expect(api.post).toHaveBeenCalledTimes(2);
  });
});
