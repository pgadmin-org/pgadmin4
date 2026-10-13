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
