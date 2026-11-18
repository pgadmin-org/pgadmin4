/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// With more rows than fit on a page, "Select All N Rows" selects the whole
// result set, so Copy must stay available and copy every row rather than
// only the page that happens to be loaded.

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

describe('ResultSetUtils.getAllRows', () => {
  const columns = [{ key: 'id', pos: 0 }, { key: 'val', pos: 1 }];
  const serverRows = [[1, 'a'], [2, 'b'], [3, 'c'], [4, 'd'], [5, 'e']];

  const getAllRows = (pageRows, pagination, total = serverRows.length) => {
    const rsu = new ResultSetUtils({}, {}, 1, true);
    rsu.clientPK = '__temp_PK';
    rsu.getWindowRows = jest.fn().mockResolvedValue({
      data: { data: { result: serverRows } },
    });
    return rsu.getAllRows(columns, pageRows, pagination, total).then((rows) => ({ rows, rsu }));
  };

  it('fetches every row from the server', async () => {
    const { rows, rsu } = await getAllRows([], {});
    expect(rsu.getWindowRows).toHaveBeenCalledWith(1, 5);
    expect(rows.map((r) => r.val)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('uses the grid rows for the loaded page, keeping unsaved edits', async () => {
    const pageRows = [{ id: 3, val: 'edited' }, { id: 4, val: 'd' }, { id: 99, val: 'new' }];
    const { rows } = await getAllRows(pageRows, { rows_from: 3, rows_to: 4 });
    expect(rows.map((r) => r.val)).toEqual(['a', 'b', 'edited', 'd', 'new', 'e']);
  });
});
