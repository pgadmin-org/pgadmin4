/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Rows can be edited and deleted through a view in View/Edit Data, but not
// added, so the backend sends can_insert: false and the grid must disable
// "Add row" and "Paste" whilst leaving delete and save alone.

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

describe('ResultSetToolbar can_insert', () => {
  let eventBus;

  const renderToolbar = (props) => {
    eventBus = {
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
            <ResultSetToolbar query="SELECT 1" totalRowCount={0} pagination={{}} {...props} />
          </QueryToolEventsContext.Provider>
        </QueryToolContext.Provider>
      </Theme>
    );
  };

  const button = (container, label) => container.querySelector(`button[data-label="${label}"]`);

  it('enables Add row and Paste when inserts are allowed', () => {
    const { container } = renderToolbar({ canEdit: true, canInsert: true });
    expect(button(container, 'Add row')).not.toBeDisabled();
    expect(button(container, 'Paste')).not.toBeDisabled();
  });

  it('disables Add row and Paste for a view, leaving editing and deleting available', () => {
    const { container } = renderToolbar({ canEdit: true, canInsert: false });
    expect(button(container, 'Add row')).toBeDisabled();
    expect(button(container, 'Paste')).toBeDisabled();

    // Delete and Save stay governed by canEdit plus selection/dirty state,
    // so make both "active" and check they are enabled.
    const listeners = Object.fromEntries(
      eventBus.registerListener.mock.calls.map(([evt, fn]) => [evt, fn]));
    React.act(() => {
      listeners[QUERY_TOOL_EVENTS.SELECTED_ROWS_COLS_CELL_CHANGED](1);
      listeners[QUERY_TOOL_EVENTS.DATAGRID_CHANGED](true);
    });
    expect(button(container, 'Delete')).not.toBeDisabled();
    expect(button(container, 'Save Data Changes')).not.toBeDisabled();
  });

  it('does not fire add-row events when the disabled buttons are clicked', () => {
    const { container } = renderToolbar({ canEdit: true, canInsert: false });
    button(container, 'Add row').click();
    button(container, 'Paste').click();
    expect(eventBus.fireEvent).not.toHaveBeenCalledWith(
      QUERY_TOOL_EVENTS.TRIGGER_ADD_ROWS, expect.anything(), expect.anything());
  });

  it('disables everything when the data is not editable at all', () => {
    const { container } = renderToolbar({ canEdit: false, canInsert: false });
    expect(button(container, 'Add row')).toBeDisabled();
    expect(button(container, 'Paste')).toBeDisabled();
    expect(button(container, 'Delete')).toBeDisabled();
  });
});

describe('ResultSetUtils.queryFinished can_insert', () => {
  const finish = (startData, pollData) => {
    const rsu = new ResultSetUtils({}, {}, 1, false);
    rsu.eventBus = { fireEvent: jest.fn() };
    rsu.setStartData(startData);
    let result;
    rsu.queryFinished(
      { data: { data: { colinfo: [], result: [], ...pollData } } },
      (data) => { result = data; },
      () => {},
    );
    return result;
  };

  it('keeps inserts enabled for an editable table', () => {
    const data = finish({ can_edit: true, can_insert: true }, { primary_keys: { id: 'int4' } });
    expect(data.can_edit).toBe(true);
    expect(data.can_insert).toBe(true);
  });

  it('disables inserts for an editable view', () => {
    const data = finish({ can_edit: true, can_insert: false }, { primary_keys: { id: 'int4' } });
    expect(data.can_edit).toBe(true);
    expect(data.can_insert).toBe(false);
  });

  it('follows can_edit when the flag is absent, as in the Query Tool', () => {
    expect(finish(null, { primary_keys: { id: 'int4' } }).can_insert).toBe(true);
    expect(finish(null, { primary_keys: {} }).can_insert).toBe(false);
  });
});
