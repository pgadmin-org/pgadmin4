/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

const mockPost = jest.fn();

jest.mock('../../../pgadmin/static/js/api_instance', () => ({
  __esModule: true,
  default: () => ({post: mockPost, delete: jest.fn()}),
  parseApiError: (e) => e,
}));
jest.mock('../../../pgadmin/static/js/Dialogs/index', () => ({
  showServerPassword: jest.fn(),
}));

const pgBrowser = {
  Nodes: {},
  Node: {
    extend: (props) => ({...props, generate_url: () => '/connect'}),
    callbacks: {selected: jest.fn()},
  },
  Collection: {extend: (props) => props},
  Events: {trigger: jest.fn(), on: jest.fn()},
  enable_disable_menus: jest.fn(),
};

// database.js registers itself through an AMD style define(); load it with a
// stub that hands the factory our fake browser.
global.define = (_name, _deps, factory) => {
  factory((s) => s, () => '', {
    Browser: {notifier: {success: jest.fn(), info: jest.fn()}},
  }, pgBrowser, {});
};
require('../../../pgadmin/browser/server_groups/servers/databases/static/js/database');
delete global.define;

describe('database node connection', () => {
  let tree, serverItem, dbItem, dbData;

  beforeEach(() => {
    jest.useFakeTimers();
    serverItem = {id: 'server'};
    dbItem = {id: 'db'};
    dbData = {_type: 'database', connected: false, allowConn: true, icon: 'x'};
    tree = {
      selected: jest.fn(),
      addIcon: jest.fn(),
      removeIcon: jest.fn(),
      select: jest.fn(),
      open: jest.fn(),
    };
    pgBrowser.tree = tree;
    pgBrowser.enable_disable_menus.mockClear();
    pgBrowser.Node.callbacks.selected.mockClear();
    mockPost.mockReset();
    mockPost.mockResolvedValue({data: {
      success: 1, info: 'Connected', data: {connected: true, icon: 'y'},
    }});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const connectByExpanding = async () => {
    const node = pgBrowser.Nodes['database'];
    expect(node.callbacks.beforeopen.call(node, dbItem, dbData)).toBe(false);
    // Let the mocked API call resolve and the success handler run.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  it('keeps the menus on the selected server when a database is connected by expanding it', async () => {
    tree.selected.mockReturnValue(serverItem);

    await connectByExpanding();

    expect(dbData.connected).toBe(true);
    expect(pgBrowser.enable_disable_menus).toHaveBeenCalledWith();
    expect(pgBrowser.enable_disable_menus).not.toHaveBeenCalledWith(dbItem);
    expect(pgBrowser.Node.callbacks.selected).not.toHaveBeenCalled();
  });

  it('updates the menus for the database when it is the selected node', async () => {
    tree.selected.mockReturnValue(dbItem);

    await connectByExpanding();

    expect(dbData.connected).toBe(true);
    expect(pgBrowser.Node.callbacks.selected).toHaveBeenCalledWith(dbItem, dbData);
  });
});
