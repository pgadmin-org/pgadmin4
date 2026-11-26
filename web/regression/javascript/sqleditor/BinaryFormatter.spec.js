/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// A bytea cell shows the [binary data] placeholder, or the hex text the
// backend sends when "Show binary data as hex?" is on, truncated to the
// maximum column data display length like any other text.

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

jest.mock('../../../pgadmin/preferences/static/js/store', () => {
  const prefs = {
    'misc.enable_binary_data_download': false,
    'sqleditor.max_column_data_display_length': 8,
  };
  return {
    __esModule: true,
    default: () => ({
      getPreferences: (module, name) => ({value: prefs[`${module}.${name}`]}),
    }),
  };
});

import { render } from '@testing-library/react';
import { BinaryFormatter } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid/Formatters';

const column = {key: 'b', pos: 0};

function renderCell(value) {
  return render(<BinaryFormatter row={{b: value}} column={column} rowIdx={0}/>).container;
}

describe('BinaryFormatter', () => {
  it('shows the placeholder in brackets', () => {
    expect(renderCell('binary data').textContent.trim()).toBe('[binary data]');
  });

  it('shows short hex text as it is', () => {
    expect(renderCell('\\x00ff').textContent.trim()).toBe('\\x00ff');
  });

  it('truncates long hex text to the display length', () => {
    expect(renderCell('\\x00112233445566').textContent.trim()).toBe('\\x001122...');
  });

  it('shows null as [null]', () => {
    expect(renderCell(null).textContent.trim()).toBe('[null]');
  });
});
