/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {waitFor} from '@testing-library/react';

jest.unmock('zustand');
jest.mock('../../../pgadmin/llm/static/js/AIReport', () => jest.fn());
jest.mock('../../../pgadmin/static/js/api_instance', () => () => ({get: mockGet}));
jest.mock('sources/url_for', () => (name) => name);
jest.mock('sources/pgadmin', () => ({}));
jest.mock('../../../pgadmin/browser/static/js/MainMenuFactory', () => ({
  createMainMenus: jest.fn(), enableDisableMenus: jest.fn(),
}));

const mockGet = jest.fn();
const status = (enabled) => ({data: {success: true, data: {enabled, system_enabled: true}}});

describe('AI tools after preferences are saved', () => {
  let browser, pgAdmin, preferences, tools;

  beforeEach(() => {
    jest.resetModules();
    mockGet.mockReset();
    browser = {add_menus: jest.fn(), add_menu_category: jest.fn()};
    pgAdmin = require('sources/pgadmin');
    preferences = require('../../../pgadmin/preferences/static/js/store').default;
    global.define = (_deps, factory) => factory((s) => s, browser);
    try {
      require('../../../pgadmin/llm/static/js/ai_tools');
    } finally {
      delete global.define;
    }
    tools = browser.AITools;
  });

  // PreferencesComponent calls cache() after a successful save.
  async function refreshPreferences(provider) {
    mockGet.mockResolvedValueOnce({data: [{module: 'ai', name: 'default_provider', value: provider}]});
    await preferences.getState().cache();
  }

  it('updates report menus and the flag for new Query Tools without registering duplicate menus', async () => {
    await refreshPreferences('');
    mockGet.mockResolvedValue(status(false));
    tools.init();
    await waitFor(() => expect(tools.llmStatusChecked).toBe(true));
    expect(tools.checkLLMEnabled()).toBe(false);
    mockGet.mockResolvedValue(status(true));
    await refreshPreferences('ollama');
    await waitFor(() => expect(pgAdmin.llm_enabled).toBe(true));
    expect(tools.checkLLMEnabled()).toBe(true);

    tools.init();
    const calls = mockGet.mock.calls.length;
    await refreshPreferences('ollama');
    expect(mockGet.mock.calls.slice(calls)).toEqual([['preferences.get_all']]);
    mockGet.mockResolvedValue(status(false));
    await refreshPreferences('');
    await waitFor(() => expect(pgAdmin.llm_enabled).toBe(false));
    expect(tools.checkLLMEnabled()).toBe(false);
    expect(browser.add_menus).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed lookup disabled even if an older successful request finishes later', async () => {
    let resolveFirst;
    mockGet.mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }));
    tools.init();
    mockGet.mockRejectedValue(new Error('status unavailable'));
    await refreshPreferences('openai');
    await waitFor(() => expect(tools.llmStatusChecked).toBe(true));
    resolveFirst(status(true));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(tools.checkLLMEnabled()).toBe(false);
    expect(pgAdmin.llm_enabled).toBe(false);
    expect(browser.add_menus).not.toHaveBeenCalled();
  });
});
