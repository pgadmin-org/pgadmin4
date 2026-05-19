/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { render } from '@testing-library/react';

jest.mock('../../pgadmin/settings/static/ApplicationStateProvider', () => ({
  useApplicationState: () => ({ deleteToolData: jest.fn() }),
}));

import ToolErrorView from '../../pgadmin/static/js/ToolErrorView';
import { withTheme } from './fake_theme';

const ThemedToolErrorView = withTheme(ToolErrorView);

function makePanelDocker() {
  return {
    eventBus: { registerListener: jest.fn() },
    close: jest.fn(),
  };
}


describe('ToolErrorView', () => {
  it('renders the error string as plain text, no HTML parsing', () => {
    const error = '<b>bold</b><br/>line two';
    const ctrl = render(
      <ThemedToolErrorView
        error={error}
        panelId="p1"
        panelDocker={makePanelDocker()} />);
    expect(ctrl.container.querySelector('b')).toBeNull();
    expect(ctrl.container.querySelector('br')).toBeNull();
    expect(ctrl.container.textContent).toContain(error);
  });

  it('does not execute iframe srcdoc payload', () => {
    const xss = '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;">';
    const ctrl = render(
      <ThemedToolErrorView
        error={xss}
        panelId="p1"
        panelDocker={makePanelDocker()} />);
    expect(ctrl.container.querySelector('iframe')).toBeNull();
    expect(ctrl.container.querySelector('script')).toBeNull();
  });

  it('handles missing error gracefully', () => {
    const ctrl = render(
      <ThemedToolErrorView
        error={undefined}
        panelId="p1"
        panelDocker={makePanelDocker()} />);
    // Should render the wrapper without crashing.
    expect(ctrl.container.textContent)
      .toContain('An error occurred while opening the tool');
  });
});
