/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

jest.mock('../../../pgadmin/browser/server_groups/servers/pg_timetable/static/js/pgt_chain.ui', () => ({
  __esModule: true, default: jest.fn(),
}));
jest.mock('../../../pgadmin/browser/server_groups/servers/pg_timetable/tasks/static/js/pgt_chaintask.ui', () => ({
  getNodePgtChainTaskSchema: jest.fn(),
}));
jest.mock('../../../pgadmin/static/js/api_instance', () => ({
  __esModule: true, default: jest.fn(),
}));

const pgBrowser = {
  Nodes: {},
  Node: {extend: (props) => props},
  Collection: {extend: (props) => props},
  Events: {on: jest.fn()},
  add_menus: jest.fn(),
  enable_disable_menus: jest.fn(),
};

// The node module registers itself through an AMD style define(); load it
// with a stub that hands the factory our fake browser.
global.define = (_name, _deps, factory) => {
  factory((s) => s, () => '', pgBrowser);
};
require('../../../pgadmin/browser/server_groups/servers/pg_timetable/static/js/pgt_chain');
delete global.define;

describe('pgTimeTable Chain create menu on the server', () => {
  const serverMenu = pgBrowser.add_menus.mock.calls[0][0].find(
    (m) => m.name === 'create_pgt_chain_on_server'
  );
  const addedHandler = pgBrowser.Events.on.mock.calls.find(
    (c) => c[0] === 'pgadmin-browser:tree:added'
  )[1];

  const setChildren = (types) => {
    const children = types.map((t) => ({_type: t}));
    pgBrowser.tree = {
      children: jest.fn(() => children),
      itemData: (child) => child,
    };
  };

  beforeEach(() => {
    pgBrowser.enable_disable_menus.mockClear();
  });

  it('is enabled when the server has a pgTimeTable Chains collection', () => {
    setChildren(['coll-database', 'coll-pgt_chain']);
    expect(serverMenu.enable({connected: true}, {})).toBe(true);
  });

  it('is disabled when the collection is not present', () => {
    setChildren(['coll-database', 'coll-role']);
    expect(serverMenu.enable({connected: true}, {})).toBe(false);
  });

  it('is disabled when the server children are not loaded', () => {
    pgBrowser.tree = {children: jest.fn(() => undefined), itemData: jest.fn()};
    expect(serverMenu.enable({connected: true}, {})).toBe(false);
  });

  it('is disabled when the server is not connected', () => {
    setChildren(['coll-pgt_chain']);
    expect(serverMenu.enable({connected: false}, {})).toBe(false);
  });

  it('refreshes the menus when the collection is added to the tree', () => {
    addedHandler({}, {_type: 'coll-pgt_chain'});
    expect(pgBrowser.enable_disable_menus).toHaveBeenCalledTimes(1);
  });

  it('does not refresh the menus for other nodes', () => {
    addedHandler({}, {_type: 'coll-database'});
    addedHandler({}, undefined);
    expect(pgBrowser.enable_disable_menus).not.toHaveBeenCalled();
  });
});
