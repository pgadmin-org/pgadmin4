/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Mock url_for
jest.mock('sources/url_for', () => ({
  __esModule: true,
  default: jest.fn((endpoint) => `/mock/${endpoint}`),
}));

// Mock the QueryToolComponent to avoid importing all its dependencies
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx', () => {
  const React = require('react');
  return {
    QueryToolContext: React.createContext(null),
    QueryToolConnectionContext: React.createContext(null),
    QueryToolEventsContext: React.createContext(null),
  };
});

// Mock CodeMirror
jest.mock('../../../pgadmin/static/js/components/ReactCodeMirror', () => ({
  __esModule: true,
  default: ({ value }) => value,
}));

import { getDateFormatted, getTimeFormatted } from '../../../pgadmin/tools/sqleditor/static/js/components/sections/QueryHistory.jsx';

describe('QueryHistory date/time formatting', () => {
  it('formats a date using the native locale formatter', () => {
    const date = new Date(2025, 0, 15);
    expect(getDateFormatted(date)).toBe(date.toLocaleDateString());
  });

  it('formats a time using the native locale formatter', () => {
    const time = new Date(2025, 0, 15, 10, 30, 45);
    expect(getTimeFormatted(time)).toBe(time.toLocaleTimeString());
  });

  // Regression test for #7596: a malformed default locale makes
  // toLocaleDateString/toLocaleTimeString throw "RangeError: Incorrect
  // locale information provided". The helpers must not propagate the throw
  // (which would white-screen the SQL editor) and must return a usable
  // string instead.
  describe('when the runtime locale is broken', () => {
    let dateSpy, timeSpy;

    beforeEach(() => {
      dateSpy = jest.spyOn(Date.prototype, 'toLocaleDateString')
        .mockImplementation(() => {
          throw new RangeError('Incorrect locale information provided');
        });
      timeSpy = jest.spyOn(Date.prototype, 'toLocaleTimeString')
        .mockImplementation(() => {
          throw new RangeError('Incorrect locale information provided');
        });
    });

    afterEach(() => {
      dateSpy.mockRestore();
      timeSpy.mockRestore();
    });

    it('does not throw and returns a non-empty date string', () => {
      const date = new Date(2025, 0, 15);
      let result;
      expect(() => { result = getDateFormatted(date); }).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('does not throw and returns a non-empty time string', () => {
      const time = new Date(2025, 0, 15, 10, 30, 45);
      let result;
      expect(() => { result = getTimeFormatted(time); }).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
