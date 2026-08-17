/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// keyboard.js reaches pgadmin.js by relative path, which skips the
// sources/pgadmin alias that maps to the fake, so point it there explicitly.
jest.mock('../../../pgadmin/static/js/pgadmin', () =>
  jest.requireActual('../fake_pgadmin'));

import pgAdmin from 'sources/pgadmin';
import '../../../pgadmin/browser/static/js/keyboard';

// Cycling between workspace tabs must stay in the workspace: the object
// explorer is a tab-set of its own, and the SQL editor, ERD and Schema Diff
// each render a nested DockLayout whose own tabs carry the same
// dock-tab-active class (issue #7232).
describe('keyboardNavigation.bindRightPanel', () => {
  const shortcutObj = {
    tabbed_panel_forward: 'ctrl+alt+]',
    tabbed_panel_backward: 'ctrl+alt+[',
    close_tab_panel: 'shift+alt+w',
  };

  const tabBtn = (id, isActive) => {
    const tab = document.createElement('div');
    tab.className = isActive ? 'dock-tab dock-tab-active' : 'dock-tab';
    const btn = document.createElement('div');
    btn.className = 'dock-tab-btn';
    btn.id = `rc-dock-tab-btn-${id}`;
    tab.appendChild(btn);
    return tab;
  };

  const panel = (tabs) => {
    const el = document.createElement('div');
    el.className = 'dock-panel';
    tabs.forEach((tab) => el.appendChild(tab));
    return el;
  };

  /* A workspace holding the object explorer, three workspace tabs and, inside
   * the active workspace tab, a tool with its own dock layout. */
  const buildLayout = ({activeWorkspaceTab = 'id-dashboard'} = {}) => {
    const root = document.createElement('div');
    root.id = 'root';

    const topLayout = document.createElement('div');
    topLayout.className = 'dock-layout';
    root.appendChild(topLayout);

    topLayout.appendChild(panel([tabBtn('id-object-explorer', true)]));

    const workspaceTabs = ['id-dashboard', 'id-properties', 'id-sql'].map(
      (id) => tabBtn(id, id === activeWorkspaceTab));
    const workspacePanel = panel(workspaceTabs);
    topLayout.appendChild(workspacePanel);

    // The tool's own dock layout, nested inside the workspace panel exactly
    // as the SQL editor's is.
    const innerLayout = document.createElement('div');
    innerLayout.className = 'dock-layout';
    innerLayout.appendChild(panel([
      tabBtn('id-dataoutput', true),
      tabBtn('id-messages', false),
    ]));
    workspacePanel.appendChild(innerLayout);

    document.body.appendChild(root);
    return {root, workspacePanel};
  };

  let focusTabSpy;

  beforeEach(() => {
    document.body.innerHTML = '';
    pgAdmin.Browser.keyboardNavigation.keyboardShortcut = shortcutObj;
    focusTabSpy = jest.spyOn(
      pgAdmin.Browser.keyboardNavigation, '_focusTab'
    ).mockImplementation(() => {});
  });

  afterEach(() => {
    focusTabSpy.mockRestore();
    document.body.innerHTML = '';
  });

  it('cycles the workspace tabs, not a tool\'s nested tabs', () => {
    buildLayout();

    pgAdmin.Browser.keyboardNavigation.bindRightPanel(
      new Event('keydown'), {key: shortcutObj.tabbed_panel_forward});

    expect(focusTabSpy).toHaveBeenCalled();
    const [tabs, activeIdx] = focusTabSpy.mock.calls[0];
    const ids = tabs.map((tab) => tab.id);

    expect(ids).toEqual([
      'rc-dock-tab-btn-id-dashboard',
      'rc-dock-tab-btn-id-properties',
      'rc-dock-tab-btn-id-sql',
    ]);
    // Neither the nested tool tabs nor the object explorer may take part.
    expect(ids).not.toContain('rc-dock-tab-btn-id-dataoutput');
    expect(ids).not.toContain('rc-dock-tab-btn-id-object-explorer');
    expect(tabs[activeIdx].id).toBe('rc-dock-tab-btn-id-dashboard');
  });

  it('starts from whichever workspace tab is active', () => {
    buildLayout({activeWorkspaceTab: 'id-sql'});

    pgAdmin.Browser.keyboardNavigation.bindRightPanel(
      new Event('keydown'), {key: shortcutObj.tabbed_panel_backward});

    const [tabs, activeIdx] = focusTabSpy.mock.calls[0];
    expect(tabs[activeIdx].id).toBe('rc-dock-tab-btn-id-sql');
  });

  /* The selection must not depend on where the nested layout happens to sit
   * in the DOM: rc-dock is free to order panels as it likes, and an inner
   * layout appearing first would otherwise win the search for the active
   * tab and cycle a tool's own tabs. */
  it('ignores nested tool tabs even when they come first in the DOM', () => {
    const root = document.createElement('div');
    root.id = 'root';
    const topLayout = document.createElement('div');
    topLayout.className = 'dock-layout';
    root.appendChild(topLayout);

    const innerLayout = document.createElement('div');
    innerLayout.className = 'dock-layout';
    innerLayout.appendChild(panel([
      tabBtn('id-dataoutput', true),
      tabBtn('id-messages', false),
    ]));
    topLayout.appendChild(innerLayout);

    topLayout.appendChild(panel([tabBtn('id-object-explorer', true)]));
    topLayout.appendChild(panel([
      tabBtn('id-dashboard', false),
      tabBtn('id-sql', true),
    ]));
    document.body.appendChild(root);

    pgAdmin.Browser.keyboardNavigation.bindRightPanel(
      new Event('keydown'), {key: shortcutObj.tabbed_panel_forward});

    expect(focusTabSpy).toHaveBeenCalled();
    const [tabs, activeIdx] = focusTabSpy.mock.calls[0];
    const ids = tabs.map((tab) => tab.id);
    expect(ids).toEqual([
      'rc-dock-tab-btn-id-dashboard',
      'rc-dock-tab-btn-id-sql',
    ]);
    expect(tabs[activeIdx].id).toBe('rc-dock-tab-btn-id-sql');
  });

  it('does nothing when only the object explorer is present', () => {
    const root = document.createElement('div');
    root.id = 'root';
    const topLayout = document.createElement('div');
    topLayout.className = 'dock-layout';
    topLayout.appendChild(panel([tabBtn('id-object-explorer', true)]));
    root.appendChild(topLayout);
    document.body.appendChild(root);

    pgAdmin.Browser.keyboardNavigation.bindRightPanel(
      new Event('keydown'), {key: shortcutObj.tabbed_panel_forward});

    expect(focusTabSpy).not.toHaveBeenCalled();
  });
});
