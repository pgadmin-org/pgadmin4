/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// The SQL button on the Data Output toolbar shows the query that produced the
// result set in a popup that closes when the button loses focus, so the
// popup's copy button must copy the query without taking the focus.

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

import { render, fireEvent, screen } from '@testing-library/react';
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

  it('copies the query without moving the focus off the SQL button', () => {
    const { container } = renderToolbar();
    fireEvent.click(container.querySelector('#sql-query'));

    const copyBtn = document.body.querySelector('button[data-label="Copy SQL"]');
    expect(copyBtn).not.toBeNull();
    expect(fireEvent.mouseDown(copyBtn)).toBe(false);
    fireEvent.click(copyBtn);

    expect(copyToClipboard).toHaveBeenCalledWith(query);
    expect(screen.getByText(query)).toBeInTheDocument();
  });
});
