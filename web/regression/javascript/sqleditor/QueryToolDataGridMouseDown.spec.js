/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Shift + mousedown on a results grid cell extends the cell range, but on
// the row number column it must select the cell as a plain click does, so
// that row selection is not mixed with a left-over cell range.

jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx', () => {
  const React = require('react');
  return {
    QueryToolContext: React.createContext(null),
    QueryToolConnectionContext: React.createContext(null),
    QueryToolEventsContext: React.createContext(null),
  };
});

// The cell editors pull in ESM-only dependencies that Jest cannot load.
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid/Editors', () => ({}));

import {
  onCellMouseDown, ROWNUM_KEY,
} from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid';

function mouseDown(columnKey, shiftKey) {
  const selectCell = jest.fn();
  const e = {shiftKey, preventGridDefault: jest.fn()};
  onCellMouseDown({column: {key: columnKey}, selectCell}, e);
  return {selectCell, e};
}

describe('QueryToolDataGrid onCellMouseDown', () => {
  it('selects the row number cell on shift + mousedown', () => {
    const {selectCell, e} = mouseDown(ROWNUM_KEY, true);
    expect(e.preventGridDefault).toHaveBeenCalled();
    expect(selectCell).toHaveBeenCalled();
  });

  it('leaves shift + mousedown on a data cell to the grid', () => {
    const {selectCell, e} = mouseDown('col1', true);
    expect(e.preventGridDefault).not.toHaveBeenCalled();
    expect(selectCell).not.toHaveBeenCalled();
  });

  it('leaves a plain mousedown on the row number cell to the grid', () => {
    const {selectCell, e} = mouseDown(ROWNUM_KEY, false);
    expect(e.preventGridDefault).not.toHaveBeenCalled();
    expect(selectCell).not.toHaveBeenCalled();
  });
});
