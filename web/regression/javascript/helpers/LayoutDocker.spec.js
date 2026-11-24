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

// A minimal stand-in for rc-dock's DockLayout, removing tabs the way
// rc-dock does: if the active tab goes, the tab to its right is selected,
// or the first tab when there is none to the right.
const createCloseablePanelDocker = () => {
  const panel = {id: 'panel-1', activeId: null, tabs: []};
  ['t1', 't2', 't3', 't4'].forEach((id) => {
    panel.tabs.push({id, parent: panel, internal: {closable: true}});
  });
  const docker = new LayoutDocker('Browser/Layout', {}, 'id-dashboard');
  docker.layoutObj = {
    find: jest.fn((id) => {
      if(id === panel.id) return panel;
      return panel.tabs.find((t) => t.id === id) ?? null;
    }),
    updateTab: jest.fn((id) => {
      panel.activeId = id;
    }),
    dockMove: jest.fn((tab, _target, direction) => {
      if(direction !== 'remove') return;
      const pos = panel.tabs.indexOf(tab);
      panel.tabs.splice(pos, 1);
      if(panel.activeId === tab.id && panel.tabs.length) {
        panel.activeId = (panel.tabs[pos] ?? panel.tabs[0]).id;
      }
    }),
  };
  jest.spyOn(docker.eventBus, 'fireEvent');
  return {docker, panel};
};

describe('LayoutDocker.close', () => {
  let docker, panel;

  beforeEach(() => {
    ({docker, panel} = createCloseablePanelDocker());
  });

  const tabIds = () => panel.tabs.map((t) => t.id);

  it('selects the tab to the left when the active right-most tab is closed', () => {
    panel.activeId = 't4';
    docker.close('t4');

    expect(tabIds()).toEqual(['t1', 't2', 't3']);
    expect(panel.activeId).toBe('t3');
    expect(docker.eventBus.fireEvent).toHaveBeenCalledWith('active', 't3');
  });

  it('selects the tab to the right when an active middle tab is closed', () => {
    panel.activeId = 't2';
    docker.close('t2');

    expect(tabIds()).toEqual(['t1', 't3', 't4']);
    expect(panel.activeId).toBe('t3');
  });

  it('keeps the current selection when an inactive tab is closed', () => {
    panel.activeId = 't2';
    docker.close('t4');

    expect(tabIds()).toEqual(['t1', 't2', 't3']);
    expect(panel.activeId).toBe('t2');
    expect(docker.layoutObj.updateTab).not.toHaveBeenCalled();
  });

  it('closes the only tab without trying to select another', () => {
    panel.tabs.splice(1);
    panel.activeId = 't1';
    docker.close('t1');

    expect(tabIds()).toEqual([]);
    expect(docker.layoutObj.updateTab).not.toHaveBeenCalled();
  });
});

describe('LayoutDocker.closeAll', () => {
  let docker, panel;

  beforeEach(() => {
    ({docker, panel} = createCloseablePanelDocker());
  });

  const tabIds = () => panel.tabs.map((t) => t.id);

  it('closes every closable tab except the current one', () => {
    panel.tabs[0].internal.closable = false;
    panel.activeId = 't2';
    docker.closeAll('t2', true);

    expect(tabIds()).toEqual(['t1', 't2']);
    expect(panel.activeId).toBe('t2');
  });

  it('does nothing when the tab does not exist', () => {
    panel.activeId = 't2';
    docker.closeAll('missing');

    expect(tabIds()).toEqual(['t1', 't2', 't3', 't4']);
    expect(docker.layoutObj.dockMove).not.toHaveBeenCalled();
  });
});

describe('LayoutDocker.closeToTheRight', () => {
  let docker, panel;

  beforeEach(() => {
    ({docker, panel} = createCloseablePanelDocker());
  });

  const tabIds = () => panel.tabs.map((t) => t.id);

  it('closes only the closable tabs to the right of the current tab', () => {
    panel.activeId = 't2';
    docker.closeToTheRight('t2');

    expect(tabIds()).toEqual(['t1', 't2']);
    expect(panel.activeId).toBe('t2');
  });

  it('keeps the active tab when it is to the left of the closed tabs', () => {
    panel.activeId = 't1';
    docker.closeToTheRight('t2');

    expect(tabIds()).toEqual(['t1', 't2']);
    expect(panel.activeId).toBe('t1');
    expect(docker.layoutObj.updateTab).not.toHaveBeenCalled();
  });

  it('selects the origin tab when the active tab is to the right', () => {
    panel.activeId = 't4';
    docker.closeToTheRight('t2');

    expect(tabIds()).toEqual(['t1', 't2']);
    expect(panel.activeId).toBe('t2');
    expect(docker.eventBus.fireEvent).toHaveBeenCalledWith('active', 't2');
  });

  it('leaves non-closable tabs to the right in place', () => {
    panel.tabs[2].internal.closable = false;
    panel.activeId = 't1';
    docker.closeToTheRight('t1');

    expect(tabIds()).toEqual(['t1', 't3']);
    expect(panel.activeId).toBe('t1');
  });

  it('does nothing when the current tab is the right-most', () => {
    panel.activeId = 't4';
    docker.closeToTheRight('t4');

    expect(tabIds()).toEqual(['t1', 't2', 't3', 't4']);
    expect(panel.activeId).toBe('t4');
    expect(docker.layoutObj.dockMove).not.toHaveBeenCalled();
  });

  it('does nothing when the tab does not exist', () => {
    panel.activeId = 't2';
    docker.closeToTheRight('missing');

    expect(tabIds()).toEqual(['t1', 't2', 't3', 't4']);
    expect(panel.activeId).toBe('t2');
    expect(docker.layoutObj.dockMove).not.toHaveBeenCalled();
  });
});

const closingCalls = (docker, id) => docker.eventBus.fireEvent.mock.calls
  .filter((call) => call[0] === 'closing' && call[1] === id);

describe('LayoutDocker sequential close', () => {
  let docker, panel;

  beforeEach(() => {
    jest.useFakeTimers();
    ({docker, panel} = createCloseablePanelDocker());
    panel.tabs.forEach((t) => {
      t.internal.manualClose = true;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const tabIds = () => panel.tabs.map((t) => t.id);
  const flushPaint = () => jest.advanceTimersByTimeAsync(32);

  it('asks only the rightmost manual tab, after it is on screen', async () => {
    panel.activeId = 't1';
    docker.closeAll('t1');

    expect(panel.activeId).toBe('t4');
    expect(closingCalls(docker, 't4')).toHaveLength(0);
    expect(closingCalls(docker, 't1')).toHaveLength(0);

    await flushPaint();

    expect(closingCalls(docker, 't4')).toHaveLength(1);
    expect(closingCalls(docker, 't1')).toHaveLength(0);
    expect(closingCalls(docker, 't3')).toHaveLength(0);
  });

  it('asks the next tab to the left only after the current one closes', async () => {
    panel.activeId = 't1';
    docker.closeAll('t1');
    await flushPaint();

    docker.close('t4', true);
    expect(tabIds()).toEqual(['t1', 't2', 't3']);
    expect(panel.activeId).toBe('t3');
    expect(docker.eventBus.fireEvent).toHaveBeenCalledWith('active', 't3');
    expect(closingCalls(docker, 't3')).toHaveLength(0);

    await flushPaint();

    expect(closingCalls(docker, 't3')).toHaveLength(1);
    expect(closingCalls(docker, 't2')).toHaveLength(0);
  });

  it('keeps a cancelled tab open and asks the next one', async () => {
    panel.activeId = 't1';
    docker.closeAll('t1');
    await flushPaint();

    docker.retainTabInCloseQueue('t4');
    expect(tabIds()).toEqual(['t1', 't2', 't3', 't4']);
    expect(panel.activeId).toBe('t3');

    await flushPaint();

    expect(closingCalls(docker, 't4')).toHaveLength(1);
    expect(closingCalls(docker, 't3')).toHaveLength(1);
  });

  it('focuses an inactive tab before asking it to close on its own', async () => {
    panel.activeId = 't1';
    docker.close('t4');

    expect(panel.activeId).toBe('t4');
    expect(tabIds()).toEqual(['t1', 't2', 't3', 't4']);
    expect(closingCalls(docker, 't4')).toHaveLength(0);
    expect(docker.layoutObj.dockMove).not.toHaveBeenCalled();

    await flushPaint();

    expect(closingCalls(docker, 't4')).toHaveLength(1);
    expect(closingCalls(docker, 't1')).toHaveLength(0);
  });

  it('replaces an in-progress batch with the new one', async () => {
    panel.activeId = 't1';
    docker.closeAll('t1');
    await flushPaint();
    expect(closingCalls(docker, 't4')).toHaveLength(1);

    docker.closeAll('t4', true);
    expect(panel.activeId).toBe('t3');

    await flushPaint();

    expect(closingCalls(docker, 't4')).toHaveLength(1);
    expect(closingCalls(docker, 't3')).toHaveLength(1);
    expect(closingCalls(docker, 't1')).toHaveLength(0);
  });
});
