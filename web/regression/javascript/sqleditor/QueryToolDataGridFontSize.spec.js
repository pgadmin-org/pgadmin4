/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// The results grid font size preference scales the grid's font, header line
// height and row heights, whilst the default keeps today's sizes (#9213).

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

import { getGridSizes } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid';

const DEFAULT_SIZES = {fontSize: 12, headerLineHeight: 16, rowHeight: 25, headerRowHeight: 40};

describe('QueryToolDataGrid getGridSizes', () => {
  it.each([
    ['the default numeric value', 1],
    ['the default as a string', '1'],
    ['a value that rounds to the default', '1.001'],
    ['no value', undefined],
    ['an empty value', ''],
    ['an invalid value', 'abc'],
    ['zero', 0],
    ['a negative value', -2],
  ])('keeps the default sizes for %s', (_desc, value) => {
    expect(getGridSizes(value)).toEqual(DEFAULT_SIZES);
  });

  it.each([
    [1.5, {fontSize: 18, headerLineHeight: 24, rowHeight: 38, headerRowHeight: 60}],
    ['2', {fontSize: 24, headerLineHeight: 32, rowHeight: 50, headerRowHeight: 80}],
  ])('scales the sizes for %s', (value, expected) => {
    expect(getGridSizes(value)).toEqual(expected);
  });

  it.each([0.1, 0.5, 0.8, 1, 1.2, 1.5, 3, 10])(
    'keeps both header lines and the cell text unclipped at %s', (value) => {
      const sizes = getGridSizes(value);
      expect(sizes.headerRowHeight).toBeGreaterThanOrEqual(2 * sizes.headerLineHeight + 7);
      expect(sizes.rowHeight).toBeGreaterThanOrEqual(Math.floor(sizes.fontSize * 2));
    });
});
