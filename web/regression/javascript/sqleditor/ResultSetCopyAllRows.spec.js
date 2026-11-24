/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// With more rows than fit on a page, "Select All N Rows" selects the whole
// result set, so Copy must stay available, and loads every row to copy
// rather than copying only the page that happens to be loaded.

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

// ResultSet.jsx pulls in the map and chart viewers, which this test never
// renders and whose ESM-only dependencies Jest cannot load.
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/sections/GeometryViewer', () => ({
  GeometryViewer: () => null,
}));
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/sections/GraphVisualiser', () => ({
  GraphVisualiser: () => null,
}));

import React from 'react';
import { render } from '@testing-library/react';
import Theme from 'sources/Theme';
import { QueryToolContext, QueryToolEventsContext } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx';
import { ResultSetToolbar } from '../../../pgadmin/tools/sqleditor/static/js/components/sections/ResultSetToolbar';
import { ResultSetUtils } from '../../../pgadmin/tools/sqleditor/static/js/components/sections/ResultSet';
import { QUERY_TOOL_EVENTS } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolConstants';

describe('ResultSetToolbar Copy with all rows selected', () => {
  const renderToolbar = (serverCursor) => {
    const eventBus = {
      fireEvent: jest.fn(),
      registerListener: jest.fn(),
      deregisterListener: jest.fn(),
    };
    const queryToolCtx = {
      preferences: { sqleditor: {} },
      mainContainerRef: { current: document.createElement('div') },
      server_cursor: serverCursor,
    };
    const result = render(
      <Theme>
        <QueryToolContext.Provider value={queryToolCtx}>
          <QueryToolEventsContext.Provider value={eventBus}>
            <ResultSetToolbar query="SELECT 1" canEdit={false} canInsert={false}
              totalRowCount={2500} allRowsSelect="ALL"
              pagination={{ page_size: 1000, page_no: 1, page_count: 3, rows_from: 1, rows_to: 1000 }} />
          </QueryToolEventsContext.Provider>
        </QueryToolContext.Provider>
      </Theme>
    );
    // The page's rows are selected, which is what enables Copy.
    const listeners = Object.fromEntries(
      eventBus.registerListener.mock.calls.map(([evt, fn]) => [evt, fn]));
    React.act(() => {
      listeners[QUERY_TOOL_EVENTS.SELECTED_ROWS_COLS_CELL_CHANGED](1000);
    });
    return { ...result, eventBus };
  };

  const copyButton = (container) => container.querySelector('button[data-label="Copy"]');

  it('keeps Copy enabled and fires the copy event', () => {
    const { container, eventBus } = renderToolbar(false);
    expect(copyButton(container)).not.toBeDisabled();
    copyButton(container).click();
    expect(eventBus.fireEvent).toHaveBeenCalledWith(QUERY_TOOL_EVENTS.COPY_DATA, undefined);
  });

  it('disables Copy with a server cursor, which cannot fetch earlier rows', () => {
    const { container } = renderToolbar(true);
    expect(copyButton(container)).toBeDisabled();
  });
});

// Copy loads every row through fetch_window, which reports a failed fetch
// with HTTP 200, so the failure must be raised rather than copied as no rows.
describe('ResultSetUtils.getWindowRows', () => {
  const getWindowRows = (data) => {
    const rsu = new ResultSetUtils({ get: jest.fn().mockResolvedValue({ data: { data } }) }, {}, 1, true);
    return rsu.getWindowRows(1, 2500);
  };

  it('returns the response for a successful fetch', async () => {
    const res = await getWindowRows({ status: 'Success', result: [[1]] });
    expect(res.data.data.result).toEqual([[1]]);
  });

  it.each(['Error', 'NotConnected'])('rejects a fetch with status %s', async (status) => {
    await expect(getWindowRows({ status, result: 'connection is busy' }))
      .rejects.toThrow('connection is busy');
  });

  it('discards rows for a result replaced by a query run whilst fetching', async () => {
    let respond;
    const api = { get: jest.fn(() => new Promise((resolve) => { respond = resolve; })) };
    const rsu = new ResultSetUtils(api, {}, 1, true);
    const pending = rsu.getWindowRows(1, 2500);
    // startExecution counts each query it runs.
    rsu.executionCount++;
    respond({ data: { data: { status: 'Success', result: [[1]] } } });
    await expect(pending).resolves.toBeNull();
  });
});
