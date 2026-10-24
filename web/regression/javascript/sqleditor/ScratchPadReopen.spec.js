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
              maximizable: true,
              tabs: [
                LayoutDocker.getPanel({
                  id: 'id-scratch',
                  title: 'Scratch Pad',
                  closable: true,
                  content: <textarea />,
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
  const ThemedLayout = withTheme(Layout);

  let dockerInstance;
  const renderLayout = (props = {}) => {
    render(
      <ApplicationStateProvider>
        <ThemedLayout
          defaultLayout={queryToolLayout}
          layoutId="SQLEditor/Layout"
          resetToTabPanel="id-messages"
          getLayoutInstance={(obj) => {
            dockerInstance = obj;
          }}
          {...props}
        />
      </ApplicationStateProvider>
    );
  };

  const reopenFromMenu = async (rightClickText) => {
    fireEvent.contextMenu(screen.getByText(rightClickText));
    fireEvent.click(await screen.findByText('Add Panel'));
    const item = await screen.findByText('Scratch Pad', { selector: '[role="menuitem"]' });
    act(() => {
      fireEvent.click(item);
    });
  };

  beforeEach(() => {
    getApiInstance.mockReturnValue({
      post: jest.fn().mockResolvedValue({ data: {} }),
      get: jest.fn().mockResolvedValue({ data: {} }),
    });
  });

  describe('findDefaultDockPosition', () => {
    it('docks Scratch Pad to the right of the panel holding the open Query tab', () => {
      renderLayout();
      act(() => {
        dockerInstance.close('id-scratch');
      });
      expect(dockerInstance.findDefaultDockPosition('id-scratch')).toEqual({
        refTabId: 'id-query',
        direction: 'right',
      });
    });

    it('uses the middle of the group when an open sibling shares the tab group', () => {
      renderLayout();
      act(() => {
        dockerInstance.close('id-scratch');
      });
      expect(dockerInstance.findSiblingTab('id-history', (id) => dockerInstance.isTabOpen(id)))
        .toBe('id-query');
    });

    it('returns null when no related tab is open', () => {
      renderLayout();
      expect(dockerInstance.findDefaultDockPosition('unknown-tab')).toBeNull();
    });
  });

  describe('Add Panel menu', () => {
    it('is not shown unless allowAddPanel is set', async () => {
      renderLayout();
      act(() => {
        dockerInstance.close('id-scratch');
      });
      fireEvent.contextMenu(screen.getByText('Query'));
      await screen.findByText('Close All');
      expect(screen.queryByText('Add Panel')).toBeNull();
    });

    it('reopens the Scratch Pad in its own pane to the right of Query, keeping size and maximizable', async () => {
      renderLayout({ allowAddPanel: true });
      act(() => {
        dockerInstance.close('id-scratch');
      });
      expect(dockerInstance.isTabOpen('id-scratch')).toBe(false);

      await reopenFromMenu('Query');

      expect(dockerInstance.isTabOpen('id-scratch')).toBe(true);
      const queryPanel = dockerInstance.find('id-query').parent;
      const scratchPanel = dockerInstance.find('id-scratch').parent;
      // Query group is untouched, Scratch Pad is not merged into it
      expect(queryPanel.tabs.map((t) => t.id)).toEqual(['id-query', 'id-history']);
      expect(scratchPanel.tabs.map((t) => t.id)).toEqual(['id-scratch']);
      // Both panes sit side by side, with the Scratch Pad on the right
      expect(scratchPanel.parent).toBe(queryPanel.parent);
      const siblings = scratchPanel.parent.children;
      expect(siblings.indexOf(scratchPanel)).toBeGreaterThan(siblings.indexOf(queryPanel));
      expect(scratchPanel.maximizable).toBe(true);
    });

    it('falls back to the right-clicked tab group when no related tab is open', async () => {
      renderLayout({ allowAddPanel: true });
      await act(async () => {
        dockerInstance.close('id-scratch');
      });
      const posSpy = jest.spyOn(dockerInstance, 'findDefaultDockPosition').mockReturnValue(null);
      act(() => {
        dockerInstance.reopenDefaultTab('id-scratch', 'id-messages');
      });
      posSpy.mockRestore();
      expect(dockerInstance.find('id-scratch').parent.tabs.map((t) => t.id))
        .toEqual(['id-data-output', 'id-messages', 'id-scratch']);
    });

    it('does nothing for a tab that is already open', () => {
      renderLayout({ allowAddPanel: true });
      const dockMoveSpy = jest.spyOn(dockerInstance.layoutObj, 'dockMove');
      dockerInstance.reopenDefaultTab('id-scratch', 'id-messages');
      expect(dockMoveSpy).not.toHaveBeenCalled();
      dockMoveSpy.mockRestore();
    });
  });
});
