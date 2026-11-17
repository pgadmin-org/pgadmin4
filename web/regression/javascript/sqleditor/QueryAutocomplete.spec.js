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

describe('Query autocomplete source', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('waits for the debounce delay before asking the server', async () => {
    const api = apiReturning({select: {object_type: 'keyword'}});
    const source = setup(api);
    const onAvailable = jest.fn();

    const promise = source(fakeContext(), onAvailable);
    jest.advanceTimersByTime(AUTOCOMPLETE_DEBOUNCE_MS - 1);
    expect(api.post).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(api.post).toHaveBeenCalledTimes(1);

    const res = await promise;
    expect(res.options).toEqual([{label: 'select', type: 'keyword'}]);
    expect(onAvailable).toHaveBeenCalled();
  });

  it('does not send a request when the query is aborted while waiting', async () => {
    const api = apiReturning({});
    const source = setup(api);

    const ctx = fakeContext();
    const promise = source(ctx, jest.fn());
    jest.advanceTimersByTime(AUTOCOMPLETE_DEBOUNCE_MS - 1);
    ctx.abort();
    jest.advanceTimersByTime(AUTOCOMPLETE_DEBOUNCE_MS);

    await expect(promise).resolves.toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('cancels the request in flight when the query is aborted', async () => {
    const api = {post: jest.fn((url, body, config) => new Promise((_, reject) => {
      config?.signal?.addEventListener('abort', () => reject(new Error('canceled')));
    }))};
    const source = setup(api);

    const ctx = fakeContext();
    const promise = source(ctx, jest.fn());
    jest.advanceTimersByTime(AUTOCOMPLETE_DEBOUNCE_MS);
    const signal = api.post.mock.calls[0][2]?.signal;
    expect(signal?.aborted).toBe(false);

    ctx.abort();
    expect(signal?.aborted).toBe(true);
    await expect(promise).resolves.toBeNull();
  });

  it('asks the server immediately for an explicit request', async () => {
    const api = apiReturning({});
    const source = setup(api);

    const promise = source(fakeContext({explicit: true}), jest.fn());
    expect(api.post).toHaveBeenCalledTimes(1);
    await promise;
  });

  it('still reports a server error that was not caused by an abort', async () => {
    const api = {post: jest.fn(() => Promise.reject(new Error('boom')))};
    const source = setup(api);
    const onAvailable = jest.fn();

    const promise = source(fakeContext({explicit: true}), onAvailable);
    await expect(promise).rejects.toThrow('boom');
    expect(onAvailable).toHaveBeenCalled();
  });

  it('asks CodeMirror to abort the query when the document changes', () => {
    const source = setup(apiReturning({}));
    const ctx = fakeContext({explicit: true});
    source(ctx, jest.fn());
    expect(ctx.addEventListener).toHaveBeenCalledWith(
      'abort', expect.any(Function), {onDocChange: true}
    );
  });
});
