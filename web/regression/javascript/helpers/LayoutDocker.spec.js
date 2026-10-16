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

describe('LayoutDocker.close', () => {
  let docker, panel;

  // A minimal stand-in for rc-dock's DockLayout, removing tabs the way
  // rc-dock does: if the active tab goes, the tab to its right is selected,
  // or the first tab when there is none to the right.
  const makeLayoutObj = () => ({
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
  });

  beforeEach(() => {
    panel = {id: 'panel-1', activeId: null, tabs: []};
    ['t1', 't2', 't3', 't4'].forEach((id) => {
      panel.tabs.push({id, parent: panel, internal: {closable: true}});
    });
    docker = new LayoutDocker('Browser/Layout', {}, 'id-dashboard');
    docker.layoutObj = makeLayoutObj();
    jest.spyOn(docker.eventBus, 'fireEvent');
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
