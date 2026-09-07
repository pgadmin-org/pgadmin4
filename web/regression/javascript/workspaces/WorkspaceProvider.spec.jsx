/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { act, render } from '@testing-library/react';

import { SHOW_OBJECT_EXPLORER_EVENT, TOGGLE_OBJECT_EXPLORER_EVENT } from
  '../../../pgadmin/browser/static/js/constants';
import { WorkspaceProvider, useWorkspace } from
  '../../../pgadmin/misc/workspaces/static/js/WorkspaceProvider';
import { PgAdminProvider } from '../../../pgadmin/static/js/PgAdminProvider';
import pgAdmin from '../fake_pgadmin';
import getApiInstance from '../../../pgadmin/static/js/api_instance';

jest.mock('../../../pgadmin/static/js/api_instance');

// The workspace layout, since that is the only layout with a workspace
// toolbar and therefore the only one where the Object Explorer can be
// collapsed at all.
jest.mock('../../../pgadmin/preferences/static/js/store', () => {
  const store = () => ({
    getPreferencesForModule: () => ({layout: 'workspace'}),
  });
  store.subscribe = () => () => {/* nothing to unsubscribe */};
  store.getState = () => ({});
  return {__esModule: true, default: store};
});

// The Object Explorer can be collapsed, and that choice is persisted, so the
// visibility state has to survive a reload and the writes must not be able to
// land out of order (#9631).
describe('WorkspaceProvider Object Explorer visibility', () => {
  let post;
  let workspace;

  const Consumer = () => {
    workspace = useWorkspace();
    return null;
  };

  const renderProvider = async () => {
    await act(async () => {
      render(
        <PgAdminProvider value={pgAdmin}>
          <WorkspaceProvider>
            <Consumer />
          </WorkspaceProvider>
        </PgAdminProvider>
      );
    });
  };

  beforeEach(() => {
    workspace = undefined;
    post = jest.fn(() => Promise.resolve({data: {success: 1}}));
    getApiInstance.mockReturnValue({post});
    pgAdmin.Browser.utils = {...(pgAdmin.Browser.utils ?? {}), layout: {}};
  });

  it('is visible by default', async () => {
    await renderProvider();
    expect(workspace.isObjectExplorerVisible).toBe(true);
  });

  it('starts hidden when the saved setting says so', async () => {
    pgAdmin.Browser.utils.layout['Browser/ObjectExplorerVisible'] = 'false';
    await renderProvider();
    expect(workspace.isObjectExplorerVisible).toBe(false);
  });

  it('toggles, and persists each new value', async () => {
    await renderProvider();

    await act(async () => {
      workspace.toggleObjectExplorer();
    });
    expect(workspace.isObjectExplorerVisible).toBe(false);

    await act(async () => {
      workspace.toggleObjectExplorer();
    });
    expect(workspace.isObjectExplorerVisible).toBe(true);

    expect(post).toHaveBeenCalledTimes(2);
    const values = post.mock.calls.map(([, formData]) =>
      formData.get('value'));
    expect(values).toEqual(['false', 'true']);
  });

  /* Two toggles in one tick must not both act on the same captured state,
   * which would leave the sidebar where it started while telling the server
   * it had changed. */
  it('handles consecutive toggles before a re-render', async () => {
    await renderProvider();

    await act(async () => {
      workspace.toggleObjectExplorer();
      workspace.toggleObjectExplorer();
    });

    expect(workspace.isObjectExplorerVisible).toBe(true);
    const values = post.mock.calls.map(([, formData]) =>
      formData.get('value'));
    expect(values).toEqual(['false', 'true']);
  });

  it('toggles when asked to by code outside React', async () => {
    await renderProvider();
    expect(workspace.isObjectExplorerVisible).toBe(true);

    await act(async () => {
      pgAdmin.Browser.Events.trigger(TOGGLE_OBJECT_EXPLORER_EVENT);
    });
    expect(workspace.isObjectExplorerVisible).toBe(false);

    await act(async () => {
      pgAdmin.Browser.Events.trigger(TOGGLE_OBJECT_EXPLORER_EVENT);
    });
    expect(workspace.isObjectExplorerVisible).toBe(true);
  });

  it('shows the panel when asked to by code outside React', async () => {
    pgAdmin.Browser.utils.layout['Browser/ObjectExplorerVisible'] = 'false';
    await renderProvider();
    expect(workspace.isObjectExplorerVisible).toBe(false);

    await act(async () => {
      pgAdmin.Browser.Events.trigger(SHOW_OBJECT_EXPLORER_EVENT);
    });

    expect(workspace.isObjectExplorerVisible).toBe(true);
  });
});
