/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

jest.mock('../../../pgadmin/static/js/Dialogs', () => ({
  showRenameTab: jest.fn(),
}));
jest.mock('../../../pgadmin/static/js/UtilityView', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../../pgadmin/static/js/ToolView', () => ({
  __esModule: true,
  default: () => null,
  getToolTabParams: jest.fn(),
}));

import { LayoutDocker } from '../../../pgadmin/static/js/helpers/Layout';

describe('LayoutDocker.addMissingDefaultPanels', () => {
  // The default Query Tool layout: Query, AI Assistant, Query History.
  const makeDefaultLayout = (...ids) => ({
    dockbox: {
      mode: 'horizontal',
      children: [
        {tabs: ids.map((id) => ({id}))},
      ],
    },
  });

  let docker, savedTabs;

  const makeLayoutObj = (savedIds, activeId) => {
    savedTabs = savedIds.map((id) => ({id, parent: null}));
    const panel = {id: 'panel-1', activeId, tabs: savedTabs};
    savedTabs.forEach((t) => t.parent = panel);
    return {
      loadLayout: jest.fn(),
      getLayout: jest.fn(() => ({dockbox: {mode: 'horizontal', children: [panel]}})),
      find: jest.fn((id) => savedTabs.find((t) => t.id === id) ?? null),
      dockMove: jest.fn(),
      updateTab: jest.fn(),
    };
  };

  it('inserts a missing middle tab after its preceding default sibling, not before it', () => {
    docker = new LayoutDocker('QT/Layout', makeDefaultLayout('id-query', 'id-ai', 'id-history'), 'id-query');
    docker.layoutObj = makeLayoutObj(['id-query', 'id-history'], 'id-query');
    jest.spyOn(docker, 'focus');

    // A layout saved before the AI Assistant tab existed.
    docker.loadLayout(JSON.stringify({dockbox: {mode: 'horizontal', children: [{tabs: [{id: 'id-query'}, {id: 'id-history'}], activeId: 'id-query'}]}}));

    expect(docker.layoutObj.dockMove).toHaveBeenCalledTimes(1);
    const [panel, target, direction] = docker.layoutObj.dockMove.mock.calls[0];
    expect(panel.id).toBe('id-ai');
    expect(target.id).toBe('id-query');
    expect(direction).toBe('after-tab');
  });

  it('inserts before the nearest following sibling when no preceding sibling exists', () => {
    docker = new LayoutDocker('QT/Layout', makeDefaultLayout('id-a', 'id-b', 'id-c'), 'id-c');
    docker.layoutObj = makeLayoutObj(['id-c'], 'id-c');
    jest.spyOn(docker, 'focus');

    // Simulate rc-dock: each dockMove really inserts relative to its target.
    docker.layoutObj.dockMove.mockImplementation((panel, target, direction) => {
      const idx = savedTabs.findIndex((t) => t.id === target?.id);
      savedTabs.splice(direction === 'after-tab' ? idx + 1 : idx, 0, panel);
    });

    docker.loadLayout(JSON.stringify({dockbox: {mode: 'horizontal', children: [{tabs: [{id: 'id-c'}], activeId: 'id-c'}]}}));

    // id-a has no preceding sibling, so it docks before id-c.
    expect(docker.layoutObj.dockMove).toHaveBeenCalledTimes(2);
    expect(docker.layoutObj.dockMove.mock.calls[0][0].id).toBe('id-a');
    expect(docker.layoutObj.dockMove.mock.calls[0][2]).toBe('middle');
    expect(savedTabs.map((t) => t.id)).toEqual(['id-a', 'id-b', 'id-c']);
  });

  it('restores the previously active tab after adding missing tabs', () => {
    docker = new LayoutDocker('QT/Layout', makeDefaultLayout('id-query', 'id-ai', 'id-history'), 'id-query');
    docker.layoutObj = makeLayoutObj(['id-query', 'id-history'], 'id-query');
    jest.spyOn(docker, 'focus');

    docker.loadLayout(JSON.stringify({dockbox: {mode: 'horizontal', children: [{tabs: [{id: 'id-query'}, {id: 'id-history'}], activeId: 'id-query'}]}}));

    expect(docker.focus).toHaveBeenCalledWith('id-query');
  });

  it('does not add missing tabs that are closable', () => {
    const defaultLayout = makeDefaultLayout('id-query', 'id-ai', 'id-history');
    defaultLayout.dockbox.children[0].tabs[1].internal = {closable: true};
    docker = new LayoutDocker('QT/Layout', defaultLayout, 'id-query');
    docker.layoutObj = makeLayoutObj(['id-query', 'id-history'], 'id-query');

    docker.loadLayout(JSON.stringify({dockbox: {mode: 'horizontal', children: [{tabs: [{id: 'id-query'}, {id: 'id-history'}], activeId: 'id-query'}]}}));

    expect(docker.layoutObj.dockMove).not.toHaveBeenCalled();
  });

  it('restores several missing tabs in their default order, docking each after the previously restored tab', () => {
    docker = new LayoutDocker('QT/Layout', makeDefaultLayout('id-a', 'id-b', 'id-c', 'id-d'), 'id-a');
    docker.layoutObj = makeLayoutObj(['id-a'], 'id-a');
    jest.spyOn(docker, 'focus');
    // Simulate rc-dock: each dockMove really inserts relative to its target.
    docker.layoutObj.dockMove.mockImplementation((panel, target, direction) => {
      const idx = savedTabs.findIndex((t) => t.id === target?.id);
      savedTabs.splice(direction === 'after-tab' ? idx + 1 : idx, 0, panel);
    });

    // A saved layout holding only the first default tab: three tabs missing.
    docker.loadLayout(JSON.stringify({dockbox: {mode: 'horizontal', children: [{tabs: [{id: 'id-a'}], activeId: 'id-a'}]}}));

    expect(docker.layoutObj.dockMove).toHaveBeenCalledTimes(3);
    expect(savedTabs.map((t) => t.id)).toEqual(['id-a', 'id-b', 'id-c', 'id-d']);
  });
});
describe('LayoutDocker.resetLayout', () => {
  const defaultLayout = {
    dockbox: {
      mode: 'horizontal',
      children: [
        {tabs: [{id: 'id-object-explorer'}]},
        {tabs: [{id: 'id-dashboard'}, {id: 'id-properties'}]},
      ],
    },
  };

  const metaData = {
    toolUrl: '/sqleditor/panel/1',
    formParams: {sgid: 1, sid: 1, did: 1},
    tabParams: {title: 'postgres/postgres@PostgreSQL 18'},
  };

  const queryToolTab = {
    id: 'id-query-tool_1',
    content: 'iframe content',
    metaData: metaData,
    group: 'playground',
    internal: {title: 'postgres/postgres@PostgreSQL 18', closable: true},
  };

  let docker;

  beforeEach(() => {
    docker = new LayoutDocker('Browser/Layout', defaultLayout, 'id-dashboard');
    docker.layoutObj = {
      getLayout: jest.fn(() => ({
        dockbox: {
          mode: 'horizontal',
          children: [
            {tabs: [{id: 'id-object-explorer'}]},
            {tabs: [{id: 'id-dashboard'}, {id: 'id-properties'}, queryToolTab]},
          ],
        },
      })),
      loadLayout: jest.fn(),
      find: jest.fn((id) => (id === 'id-dashboard' ? {activeId: 'id-dashboard', id} : null)),
      dockMove: jest.fn(),
    };
    jest.spyOn(docker, 'saveLayout').mockImplementation(() => {});
    jest.spyOn(docker, 'focus').mockImplementation(() => {});
  });

  it('keeps the metaData and group of re-opened tabs so they can be restored', () => {
    docker.resetLayout();

    expect(docker.layoutObj.loadLayout).toHaveBeenCalledWith(defaultLayout);
    expect(docker.layoutObj.dockMove).toHaveBeenCalledTimes(1);

    const [panel, , direction] = docker.layoutObj.dockMove.mock.calls[0];
    expect(panel.id).toBe('id-query-tool_1');
    expect(panel.content).toBe('iframe content');
    expect(panel.metaData).toEqual(metaData);
    expect(panel.group).toBe('playground');
    expect(direction).toBe('middle');
    expect(docker.saveLayout).toHaveBeenCalled();
  });
});
