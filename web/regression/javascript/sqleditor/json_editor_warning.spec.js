/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {
  LARGE_JSON_WARNING_LENGTH,
  shouldWarnForLargeJSON,
} from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid/json_editor_warning';

describe('QueryToolDataGrid json_editor_warning', () => {
  describe('shouldWarnForLargeJSON', () => {
    it('does not warn for small string values', () => {
      expect(shouldWarnForLargeJSON('{"a":1}')).toBe(false);
      expect(shouldWarnForLargeJSON('')).toBe(false);
    });

    it('warns once a string value exceeds the threshold (#9868)', () => {
      const big = 'x'.repeat(LARGE_JSON_WARNING_LENGTH + 1);
      expect(shouldWarnForLargeJSON(big)).toBe(true);
    });

    it('does not warn exactly at the threshold', () => {
      const atLimit = 'x'.repeat(LARGE_JSON_WARNING_LENGTH);
      expect(shouldWarnForLargeJSON(atLimit)).toBe(false);
    });

    it('respects a custom threshold', () => {
      expect(shouldWarnForLargeJSON('abcd', 3)).toBe(true);
      expect(shouldWarnForLargeJSON('abc', 3)).toBe(false);
    });

    it('does not warn for non-string values', () => {
      expect(shouldWarnForLargeJSON(null)).toBe(false);
      expect(shouldWarnForLargeJSON(undefined)).toBe(false);
      expect(shouldWarnForLargeJSON(12345)).toBe(false);
      expect(shouldWarnForLargeJSON([1, 2, 3])).toBe(false);
      expect(shouldWarnForLargeJSON({ a: 1 })).toBe(false);
    });
  });
});
