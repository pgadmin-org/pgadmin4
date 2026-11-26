/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
/////////////////////////////////////////////////////////////

const mockGet = jest.fn();

jest.mock('../../../../pgadmin/static/js/api_instance', () => ({
  __esModule: true,
  default: () => ({get: mockGet}),
}));
jest.mock('../../../../pgadmin/browser/static/js/node_ajax', () => ({
  getNodeListByName: jest.fn(), getNodeAjaxOptions: jest.fn(),
}));
jest.mock('../../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/triggers/static/js/trigger.ui', () => ({
  __esModule: true, default: jest.fn(),
}));

const pgBrowser = {
  Nodes: {},
  Node: {
    extend: (props) => ({
      ...props, generate_url: jest.fn(() => '/browser/trigger/children/1/2/3/4/5/6'),
    }),
  },
  Collection: {extend: (props) => props},
  notifier: {warning: jest.fn(), pgRespErrorNotify: jest.fn()},
  stdW: {sm: 500},
};
const pgAdmin = {Browser: pgBrowser};

// The node module registers itself through an AMD style define(); load it
// with a stub that hands the factory our fake browser.
global.define = (_name, _deps, factory) => {
  factory((s) => s, () => '', pgAdmin, pgBrowser, {});
};
require('../../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/triggers/static/js/trigger');
delete global.define;

const flushPromises = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

describe('trigger node Go to Trigger Function', () => {
  const node = pgBrowser.Nodes['trigger'];
  const triggerItem = {id: 'trigger_6'};
  const funcItem = {id: 'trigger_function_100'};
  let tree;

  beforeEach(() => {
    jest.useFakeTimers();
    tree = {
      selected: jest.fn(() => triggerItem),
      itemData: jest.fn(() => ({_type: 'trigger', _id: 6})),
      getTreeNodeHierarchy: jest.fn(() => ({
        server_group: {id: 'server_group_1', _id: 1},
        server: {id: 'server_2', _id: 2},
        database: {id: 'database_3', _id: 3},
      })),
      findNodeWithToggle: jest.fn(() => Promise.resolve(funcItem)),
      select: jest.fn(() => Promise.resolve()),
    };
    pgBrowser.tree = tree;
    pgBrowser.notifier.warning.mockClear();
    pgBrowser.notifier.pgRespErrorNotify.mockClear();
    mockGet.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const showFunction = async () => {
    node.callbacks.show_trigger_function.call(node);
    await flushPromises();
    jest.runAllTimers();
    await flushPromises();
  };

  it.each([
    [false, 'schema'],
    [true, 'catalog'],
  ])('selects the function in its own schema (catalog: %s)', async (isCatalog, schemaType) => {
    mockGet.mockResolvedValue({data: {data: [
      {_type: 'trigger_function', _id: 100, _pid: 50, schema_is_catalog: isCatalog},
    ]}});

    await showFunction();

    expect(tree.findNodeWithToggle).toHaveBeenCalledWith([
      'server_group_1', 'server_2', 'coll-database_2', 'database_3',
      `coll-${schemaType}_3`, `${schemaType}_50`,
      'coll-trigger_function_50', 'trigger_function_100',
    ]);
    expect(tree.select).toHaveBeenCalledWith(funcItem, true, 'center');
    expect(pgBrowser.notifier.warning).not.toHaveBeenCalled();
  });

  it('stops suppressing tree events when the function was already loaded', async () => {
    mockGet.mockResolvedValue({data: {data: [
      {_type: 'trigger_function', _id: 100, _pid: 50, schema_is_catalog: false},
    ]}});

    // No added or opened event clears the value when the path is already
    // expanded, so the callback must do it after selecting the function.
    await showFunction();

    expect(tree.select).toHaveBeenCalled();
    expect(tree.suppressEventsForPath).toBeNull();
  });

  it('warns when the function is not shown in the tree', async () => {
    mockGet.mockResolvedValue({data: {data: [
      {_type: 'trigger_function', _id: 100, _pid: 50, schema_is_catalog: false},
    ]}});
    tree.findNodeWithToggle.mockReturnValue(Promise.reject(new Error()));

    await showFunction();

    expect(tree.select).not.toHaveBeenCalled();
    expect(tree.suppressEventsForPath).toBeNull();
    expect(pgBrowser.notifier.warning).toHaveBeenCalled();
  });

  it('warns when the server cannot find a function to show', async () => {
    mockGet.mockRejectedValue({response: {status: 410}});

    await showFunction();

    expect(tree.findNodeWithToggle).not.toHaveBeenCalled();
    expect(pgBrowser.notifier.warning).toHaveBeenCalled();
    expect(pgBrowser.notifier.pgRespErrorNotify).not.toHaveBeenCalled();
  });
});
