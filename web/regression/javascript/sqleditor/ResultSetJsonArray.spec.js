/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// json[] and jsonb[] values arrive as PostgreSQL array literals, not JSON, so
// they must be edited as text like other arrays; only json and jsonb get the
// JSON editor (#9094).

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

import { ResultSetUtils } from '../../../pgadmin/tools/sqleditor/static/js/components/sections/ResultSet';

describe('ResultSetUtils.getFinalColumn JSON types', () => {
  const rsu = new ResultSetUtils({}, {}, 1, false);
  const column = (typname) => rsu.getFinalColumn(
    { name: 'c', display_name: 'c', type_code: 1 }, true, false, { 1: typname },
  );

  it.each([
    ['json', 'Json', false],
    ['jsonb', 'Json', false],
    ['json[]', 'string', true],
    ['jsonb[]', 'string', true],
  ])('maps %s to the %s cell', (typname, cell, isArray) => {
    const col = column(typname);
    expect(col.cell).toBe(cell);
    expect(col.is_array).toBe(isArray);
    expect(col.can_edit).toBe(true);
  });
});
