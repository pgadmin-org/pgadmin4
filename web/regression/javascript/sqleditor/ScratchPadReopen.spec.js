/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { render, screen, fireEvent, act } from '@testing-library/react';
import { withTheme } from '../fake_theme';
import Layout, { LayoutDocker } from '../../../pgadmin/static/js/helpers/Layout';
import getApiInstance from '../../../pgadmin/static/js/api_instance';
import { ApplicationStateProvider } from '../../../pgadmin/settings/static/ApplicationStateProvider';

jest.mock('../../../pgadmin/static/js/api_instance');

describe('ScratchPad Reopen & LayoutDocker dock positioning', () => {
  const queryToolLayout = {
    dockbox: {
      mode: 'vertical',
      children: [
        {
          mode: 'horizontal',
          children: [
            {
              tabs: [
                LayoutDocker.getPanel({ id: 'id-query', title: 'Query' }),
                LayoutDocker.getPanel({ id: 'id-history', title: 'Query History' }),
              ],
            },
            {
              size: 75,
              tabs: [
                LayoutDocker.getPanel({
                  id: 'id-scratch',
                  title: 'Scratch Pad',
                  closable: true,
                  content: <textarea data-testid="scratch-pad-area" />,
                }),
              ],
            },
          ],
        },
        {
          mode: 'horizontal',
          children: [
            {
              tabs: [
                LayoutDocker.getPanel({ id: 'id-data-output', title: 'Data Output' }),
                LayoutDocker.getPanel({ id: 'id-messages', title: 'Messages' }),
              ],
            },
          ],
        },
      ],
    },
  };

  beforeEach(() => {
    getApiInstance.mockReturnValue({
      post: jest.fn().mockResolvedValue({ data: {} }),
      get: jest.fn().mockResolvedValue({ data: {} }),
    });
  });

  describe('findDefaultDockPosition', () => {
    let layoutDocker;

    beforeEach(() => {
      layoutDocker = new LayoutDocker('SQLEditor/Layout', queryToolLayout, 'id-messages');
    });

    it('should find adjacent dock position to the right for Scratch Pad when Query Editor is open', () => {
      const flatDefault = [
        { id: 'id-query', title: 'Query' },
        { id: 'id-history', title: 'Query History' },
        { id: 'id-scratch', title: 'Scratch Pad', internal: { closable: true } },
      ];
      const flatCurrent = [
        { id: 'id-query', title: 'Query' },
        { id: 'id-history', title: 'Query History' },
      ];

      const dockPos = layoutDocker.findDefaultDockPosition('id-scratch', flatDefault, flatCurrent);
      expect(dockPos).toEqual({
        refTabId: 'id-query',
        direction: 'right',
      });
    });

    it('should find middle direction for a tab that shares a tab group with an open sibling', () => {
      const flatDefault = [
        { id: 'id-query', title: 'Query' },
        { id: 'id-history', title: 'Query History' },
        { id: 'id-scratch', title: 'Scratch Pad', internal: { closable: true } },
      ];
      const flatCurrent = [
        { id: 'id-query', title: 'Query' },
      ];

      const dockPos = layoutDocker.findDefaultDockPosition('id-history', flatDefault, flatCurrent);
      expect(dockPos).toEqual({
        refTabId: 'id-query',
        direction: 'middle',
      });
    });
  });

  describe('Layout Context Menu Add Panel', () => {
    const ThemedLayout = withTheme(Layout);

    it('should show Add Panel menu when closable tab is closed, and reopen it upon click', async () => {
      let dockerInstance;

      render(
        <ApplicationStateProvider>
          <ThemedLayout
            defaultLayout={queryToolLayout}
            layoutId="SQLEditor/Layout"
            resetToTabPanel="id-messages"
            getLayoutInstance={(obj) => {
              dockerInstance = obj;
            }}
          />
        </ApplicationStateProvider>
      );

      // Verify Scratch Pad tab is initially present
      expect(screen.queryByText('Scratch Pad')).not.toBeNull();

      // Close Scratch Pad
      act(() => {
        dockerInstance.close('id-scratch');
      });

      expect(dockerInstance.isTabOpen('id-scratch')).toBe(false);

      // Right-click on the Query tab to trigger context menu
      const queryTabTitle = screen.getByText('Query');
      fireEvent.contextMenu(queryTabTitle);

      // Context menu should display 'Add Panel'
      const addPanelMenu = await screen.findByText('Add Panel');
      expect(addPanelMenu).not.toBeNull();

      // Click or hover on Add Panel to reveal submenu items in react-menu
      fireEvent.click(addPanelMenu);
      const scratchSubmenuItem = await screen.findByText('Scratch Pad');
      expect(scratchSubmenuItem).not.toBeNull();

      // Click on Scratch Pad in the submenu to reopen it
      act(() => {
        fireEvent.click(scratchSubmenuItem);
      });

      // Scratch Pad should now be open again
      expect(dockerInstance.isTabOpen('id-scratch')).toBe(true);
    });

    it('should use "after-tab" fallback direction for tab targets when dockPos has no explicit direction', async () => {
      let dockerInstance;

      render(
        <ApplicationStateProvider>
          <ThemedLayout
            defaultLayout={queryToolLayout}
            layoutId="SQLEditor/Layout"
            resetToTabPanel="id-messages"
            getLayoutInstance={(obj) => {
              dockerInstance = obj;
            }}
          />
        </ApplicationStateProvider>
      );

      act(() => {
        dockerInstance.close('id-scratch');
      });

      jest.spyOn(dockerInstance, 'findDefaultDockPosition').mockReturnValue(null);
      const openTabSpy = jest.spyOn(dockerInstance, 'openTab');

      const queryTabTitle = screen.getByText('Query');
      fireEvent.contextMenu(queryTabTitle);

      const addPanelMenu = await screen.findByText('Add Panel');
      fireEvent.click(addPanelMenu);
      const scratchSubmenuItem = await screen.findByText('Scratch Pad');

      act(() => {
        fireEvent.click(scratchSubmenuItem);
      });

      expect(openTabSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'id-scratch' }),
        'id-query',
        'after-tab'
      );
    });

    it('should use "middle" fallback direction when target resolves to a dock panel without explicit dockPos direction', async () => {
      let dockerInstance;

      render(
        <ApplicationStateProvider>
          <ThemedLayout
            defaultLayout={queryToolLayout}
            layoutId="SQLEditor/Layout"
            resetToTabPanel="id-messages"
            getLayoutInstance={(obj) => {
              dockerInstance = obj;
            }}
          />
        </ApplicationStateProvider>
      );

      act(() => {
        dockerInstance.close('id-scratch');
      });

      const parentPanel = dockerInstance.find('id-query').parent;
      jest.spyOn(dockerInstance, 'findDefaultDockPosition').mockReturnValue({ refTabId: parentPanel.id });
      const openTabSpy = jest.spyOn(dockerInstance, 'openTab');

      const queryTabTitle = screen.getByText('Query');
      fireEvent.contextMenu(queryTabTitle);

      const addPanelMenu = await screen.findByText('Add Panel');
      fireEvent.click(addPanelMenu);
      const scratchSubmenuItem = await screen.findByText('Scratch Pad');

      act(() => {
        fireEvent.click(scratchSubmenuItem);
      });

      expect(openTabSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'id-scratch' }),
        parentPanel.id,
        'middle'
      );
    });
  });
});
