/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

const mockPost = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../../pgadmin/static/js/api_instance', () => ({
  __esModule: true,
  default: () => ({
    post: mockPost, get: jest.fn(() => Promise.resolve({data: {}})),
    delete: mockDelete,
  }),
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
  notifier: {
    success: jest.fn(), info: jest.fn(), warning: jest.fn(),
    errorText: jest.fn(), pgRespErrorNotify: jest.fn(),
    confirm: jest.fn((_title, _msg, onOk) => onOk()),
  },
  stdW: {md: 650},
};
const pgAdmin = {Browser: pgBrowser};

// The node modules register themselves through an AMD style define(); load
// them with a stub that hands each factory our fake browser.
global.define = (_name, _deps, factory) => {
  factory((s) => s, () => '', pgAdmin, pgBrowser, {id: 1}, {});
};
require('../../../pgadmin/browser/server_groups/servers/databases/static/js/database');
require('../../../pgadmin/browser/server_groups/servers/static/js/server');
delete global.define;

// Let the mocked API calls resolve and the success handlers run.
const flushPromises = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

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
    await flushPromises();
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

describe('database node disconnection', () => {
  let tree, dbItem, dbData;

  beforeEach(() => {
    dbItem = {id: 'db'};
    dbData = {_type: 'database', connected: true, label: 'my db'};
    tree = {
      selected: jest.fn(() => dbItem),
      itemData: jest.fn(() => dbData),
      setLabel: jest.fn(),
      close: jest.fn(),
      unload: jest.fn(),
    };
    pgBrowser.tree = tree;
    pgBrowser.notifier.errorText.mockClear();
    pgBrowser.notifier.pgRespErrorNotify.mockClear();
    mockDelete.mockReset();
  });

  const disconnect = async () => {
    const node = pgBrowser.Nodes['database'];
    node.callbacks.disconnect_database.call(node, {item: dbItem});
    await flushPromises();
  };

  it('restores the label when the disconnect request fails', async () => {
    mockDelete.mockRejectedValue(new Error('404 Not Found'));

    await disconnect();

    expect(tree.setLabel).toHaveBeenCalledWith(
      dbItem, {label: '[Disconnecting...] my db', className: 'text-muted'});
    expect(tree.setLabel).toHaveBeenLastCalledWith(dbItem, {label: 'my db'});
    expect(pgBrowser.notifier.pgRespErrorNotify).toHaveBeenCalled();
  });

  it('restores the label when the server refuses to disconnect', async () => {
    mockDelete.mockResolvedValue({data: {
      success: 0, errormsg: 'Could not disconnect.',
    }});

    await disconnect();

    expect(tree.setLabel).toHaveBeenLastCalledWith(dbItem, {label: 'my db'});
    expect(pgBrowser.notifier.errorText).toHaveBeenCalledWith(
      'Could not disconnect.');
  });
});

describe('server node connection', () => {
  let tree, otherItem, serverItem, serverData;

  beforeEach(() => {
    jest.useFakeTimers();
    otherItem = {id: 'other'};
    serverItem = {id: 'server'};
    serverData = {_type: 'server', _id: 1, connected: false, icon: 'x'};
    tree = {
      selected: jest.fn(() => otherItem),
      addIcon: jest.fn(),
      removeIcon: jest.fn(),
      setLeaf: jest.fn(),
      setInode: jest.fn(),
      select: jest.fn(),
      open: jest.fn(),
    };
    pgBrowser.tree = tree;
    pgBrowser.enable_disable_menus.mockClear();
    mockPost.mockReset();
    mockPost.mockResolvedValue({data: {
      success: 1, info: 'Connected',
      data: {connected: true, icon: 'y', version: 180000},
    }});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps the menus on the selected node when a server is connected by expanding it', async () => {
    const node = pgBrowser.Nodes['server'];
    expect(node.callbacks.beforeopen.call(node, serverItem, serverData)).toBe(false);
    await flushPromises();

    expect(serverData.connected).toBe(true);
    expect(pgBrowser.enable_disable_menus).toHaveBeenCalledWith();
    expect(pgBrowser.enable_disable_menus).not.toHaveBeenCalledWith(serverItem);
  });
});
