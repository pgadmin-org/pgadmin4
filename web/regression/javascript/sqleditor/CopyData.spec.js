/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

jest.mock('sources/clipboard', () => ({
  copyToClipboard: jest.fn(),
  getFromClipboard: jest.fn(),
}));

import * as clipboard from 'sources/clipboard';
import CopyData from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid/CopyData';

describe('CopyData quoting', () => {
  const columns = [
    {key: 'id', name: 'id', cell: 'number'},
    {key: 'name', name: 'name', cell: 'string'},
  ];
  const rows = [
    {id: 1, name: 'a"b'},
    {id: 2, name: 'c'},
  ];

  const copied = (options, copyRows, copyCols, withHeaders=false) => {
    clipboard.copyToClipboard.mockClear();
    new CopyData(options).copyRowsToCsv(copyRows, copyCols, withHeaders);
    return clipboard.copyToClipboard.mock.calls[0][0];
  };

  describe.each([
    ['default (off)', {}],
    ['off', {quote_single_cell: false}],
  ])('single cell, Quote single cell copies %s', (_label, opts) => {
    it.each(['strings', 'all'])('copies unquoted with quoting=%s', (quoting) => {
      expect(copied({...opts, quoting}, [rows[0]], [columns[1]])).toBe('a"b');
    });
  });

  describe('single cell, Quote single cell copies on', () => {
    it.each([
      ['strings', '"', [columns[1]], '"a""b"'],
      ['strings', '\'', [columns[1]], '\'a"b\''],
      ['strings', '"', [columns[0]], 1],
      ['all', '"', [columns[0]], '"1"'],
      ['none', '"', [columns[1]], 'a"b'],
    ])('quoting=%s, quote_char=%s', (quoting, quoteChar, cols, expected) => {
      expect(copied({
        quote_single_cell: true, quoting, quote_char: quoteChar,
      }, [rows[0]], cols)).toBe(String(expected));
    });
  });

  it('quotes a single cell copied with headers even when off', () => {
    expect(copied({quote_single_cell: false}, [rows[0]], [columns[1]], true))
      .toBe('"name"\n"a""b"');
  });

  it.each([false, true])('multiple cells are quoted the same whatever quote_single_cell=%s', (quoteSingle) => {
    expect(copied({
      quote_single_cell: quoteSingle, quoting: 'strings', field_separator: ',',
    }, rows, columns)).toBe('1,"a""b"\n2,"c"');
  });
});
