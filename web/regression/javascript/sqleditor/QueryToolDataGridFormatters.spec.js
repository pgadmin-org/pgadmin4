/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Keep the import of Formatters light: it only needs the contexts from these.
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent', () => {
  const ReactActual = require('react');
  return { QueryToolEventsContext: ReactActual.createContext() };
});
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid', () => {
  const ReactActual = require('react');
  return { DataGridExtrasContext: ReactActual.createContext() };
});

import { getTextCellDisplayValue } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid/Formatters';

describe('QueryToolDataGrid getTextCellDisplayValue', () => {
  it.each([
    ['null', null, 100, null],
    ['undefined', undefined, 100, undefined],
    ['single line text', 'abc', 100, 'abc'],
    ['a non-string value', 123, 100, '123'],
    ['an LF line break (#8499)', 'first\nsecond', 100, 'first…'],
    ['a CRLF line break (#8499)', 'first\r\nsecond', 100, 'first…'],
    ['a trailing line break (#8499)', 'first\n', 100, 'first…'],
    ['a leading line break (#8499)', '\nsecond', 100, '…'],
    ['text longer than the limit', 'abcdef', 3, 'abc...'],
    ['multi-line text longer than the limit', 'a\nbcdef', 3, 'a b...'],
  ])('displays %s', (_desc, value, maxLength, expected) => {
    expect(getTextCellDisplayValue(value, maxLength)).toBe(expected);
  });
});
