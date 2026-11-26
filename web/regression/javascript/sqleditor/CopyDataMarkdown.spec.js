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

describe('CopyData Markdown table', () => {
  const columns = [
    { key: 'id', name: 'id', cell: 'number' },
    { key: 'note', name: 'note', cell: 'string' },
  ];
  const copyData = new CopyData();

  it('formats rows as a table with a header and delimiter row', () => {
    const rows = [{ id: 1, note: 'one' }, { id: 2, note: 'two' }];
    expect(copyData.rowsToMarkdown(rows, columns)).toBe(
      '| id | note |\n| --- | --- |\n| 1 | one |\n| 2 | two |');
  });

  it('includes the header row when there are no rows', () => {
    expect(copyData.rowsToMarkdown([], columns)).toBe('| id | note |\n| --- | --- |');
  });

  it('returns nothing when there are no columns', () => {
    expect(copyData.rowsToMarkdown([{ id: 1 }], [])).toBe('');
  });

  it.each([
    ['NULL as an empty cell', null, ''],
    ['a missing value as an empty cell', undefined, ''],
    ['an empty string as an empty cell', '', ''],
    ['false', false, 'false'],
    ['zero', 0, '0'],
    ['a pipe escaped', 'a|b', 'a\\|b'],
    ['a backslash doubled', 'C:\\temp', 'C:\\\\temp'],
    ['a backslash before a pipe without splitting the cell', 'a\\|b', 'a\\\\\\|b'],
    ['LF as <br>', 'a\nb', 'a<br>b'],
    ['CRLF as one <br>', 'a\r\nb', 'a<br>b'],
    ['CR as <br>', 'a\rb', 'a<br>b'],
    ['JSON as its text', { k: 'v|w' }, '{"k":"v\\|w"}'],
  ])('renders %s', (_desc, value, expected) => {
    expect(copyData.markdownCell(value)).toBe(expected);
  });

  it('escapes column names', () => {
    expect(copyData.rowsToMarkdown([], [{ key: 'a', name: 'a|b' }])).toBe('| a\\|b |\n| --- |');
  });

  it('copies the table and drops the paste state of a previous copy', () => {
    localStorage.setItem('copied-rows', '[]');
    localStorage.setItem('copied-with-headers', 'true');
    copyData.copyRowsToMarkdown([{ id: 1, note: null }], columns);
    expect(clipboard.copyToClipboard).toHaveBeenCalledWith('| id | note |\n| --- | --- |\n| 1 |  |');
    expect(localStorage.getItem('copied-rows')).toBeNull();
    expect(localStorage.getItem('copied-with-headers')).toBeNull();
  });
});
