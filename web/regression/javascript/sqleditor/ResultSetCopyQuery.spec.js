/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// The SQL button on the Data Output toolbar shows the query that produced the
// result set in a popup. The popup takes the focus when it opens, keeps Tab
// inside it, and closes on Escape or a click outside it.

jest.mock('sources/url_for', () => ({
  __esModule: true,
  default: jest.fn((endpoint) => `/mock/${endpoint}`),
}));

jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx', () => {
  const React = require('react');
  return {
    QueryToolContext: React.createContext(null),
    QueryToolConnectionContext: React.createContext(null),
    QueryToolEventsContext: React.createContext(null),
  };
});

jest.mock('../../../pgadmin/static/js/components/ReactCodeMirror', () => ({
  __esModule: true,
  default: ({ value }) => value,
}));

jest.mock('../../../pgadmin/static/js/components/JsonEditor', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../pgadmin/static/js/clipboard', () => ({
  copyToClipboard: jest.fn(),
}));

import { render, fireEvent, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Theme from 'sources/Theme';
import { copyToClipboard } from '../../../pgadmin/static/js/clipboard';
import { QueryToolContext, QueryToolEventsContext } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx';
import { ResultSetToolbar } from '../../../pgadmin/tools/sqleditor/static/js/components/sections/ResultSetToolbar';

describe('ResultSetToolbar SQL query popup', () => {
  const query = 'SELECT * FROM pg_class';

  const renderToolbar = () => {
    const eventBus = {
      fireEvent: jest.fn(),
      registerListener: jest.fn(),
      deregisterListener: jest.fn(),
    };
    const queryToolCtx = {
      preferences: { sqleditor: {} },
      mainContainerRef: { current: document.createElement('div') },
    };
    return render(
      <Theme>
        <QueryToolContext.Provider value={queryToolCtx}>
          <QueryToolEventsContext.Provider value={eventBus}>
            <ResultSetToolbar query={query} canEdit={false} canInsert={false}
              totalRowCount={0} pagination={{}} />
          </QueryToolEventsContext.Provider>
        </QueryToolContext.Provider>
      </Theme>
    );
  };

  const getPopup = () => document.body.querySelector('[role="dialog"]');
  const getCopyBtn = () => document.body.querySelector('button[data-label="Copy SQL"]');

  const openPopup = () => {
    const { container } = renderToolbar();
    fireEvent.click(container.querySelector('#sql-query'));
    return document.body.querySelector('button[data-label="Copy SQL"]');
  };

  it('copies the query and keeps the popup open', async () => {
    copyToClipboard.mockResolvedValue(true);
    const copyBtn = openPopup();
    expect(copyBtn).not.toBeNull();
    await act(async () => { fireEvent.click(copyBtn); });

    expect(copyToClipboard).toHaveBeenCalledWith(query);
    expect(screen.getByText(query)).toBeInTheDocument();
    expect(document.body.querySelector('button[data-label="Copied!"]')).not.toBeNull();
  });

  it('does not report success when the clipboard write fails', async () => {
    copyToClipboard.mockResolvedValue(false);
    const copyBtn = openPopup();
    await act(async () => { fireEvent.click(copyBtn); });

    expect(document.body.querySelector('button[data-label="Copy SQL"]')).not.toBeNull();
    expect(document.body.querySelector('button[data-label="Copied!"]')).toBeNull();
  });

  it('moves the focus into the popup when opened from the keyboard and keeps Tab inside it', async () => {
    const user = userEvent.setup();
    const { container } = renderToolbar();
    const sqlBtn = container.querySelector('#sql-query');
    act(() => { sqlBtn.focus(); });
    await user.keyboard('{Enter}');

    const popup = getPopup();
    expect(popup).not.toBeNull();
    expect(sqlBtn).toHaveAttribute('aria-expanded', 'true');
    expect(popup.contains(document.activeElement)).toBe(true);

    await user.tab();
    expect(document.activeElement).toBe(getCopyBtn());
    await user.tab();
    expect(getPopup()).not.toBeNull();
    expect(popup.contains(document.activeElement)).toBe(true);
    await user.tab({shift: true});
    expect(getPopup()).not.toBeNull();
    expect(popup.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape and returns the focus to the SQL button', async () => {
    const user = userEvent.setup();
    const { container } = renderToolbar();
    const sqlBtn = container.querySelector('#sql-query');
    act(() => { sqlBtn.focus(); });
    await user.keyboard('{Enter}');
    await user.tab();
    expect(document.activeElement).toBe(getCopyBtn());

    await user.keyboard('{Escape}');
    expect(getPopup()).toBeNull();
    expect(document.activeElement).toBe(sqlBtn);
    expect(sqlBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on a click outside it, and the SQL button still toggles it', async () => {
    const user = userEvent.setup();
    const { container } = renderToolbar();
    const sqlBtn = container.querySelector('#sql-query');

    await user.click(sqlBtn);
    expect(getPopup()).not.toBeNull();
    await user.click(getPopup());
    expect(getPopup()).not.toBeNull();
    await user.click(document.body);
    expect(getPopup()).toBeNull();

    await user.click(sqlBtn);
    expect(getPopup()).not.toBeNull();
    await user.click(sqlBtn);
    expect(getPopup()).toBeNull();
  });
});
