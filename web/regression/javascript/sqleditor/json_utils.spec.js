/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {
  losslessJSONParser,
  prettifyJSONString,
  prettifyJSONValue,
} from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid/json_utils';

describe('QueryToolDataGrid json_utils', () => {
  describe('prettifyJSONString', () => {
    it('preserves trailing fractional zeros (#9854)', () => {
      // A native JSON.parse/stringify round-trip would turn 10.00 into 10.
      expect(prettifyJSONString('10.00')).toBe('10.00');
      expect(prettifyJSONString('{"a":10.00,"b":3.140}')).toBe(
        '{\n  "a": 10.00,\n  "b": 3.140\n}'
      );
    });

    it('preserves big integers beyond Number precision', () => {
      expect(prettifyJSONString('{"id":1234567890123456789}')).toBe(
        '{\n  "id": 1234567890123456789\n}'
      );
    });

    it('pretty-prints with two-space indentation', () => {
      expect(prettifyJSONString('{"a":[1,2]}')).toBe(
        '{\n  "a": [\n    1,\n    2\n  ]\n}'
      );
    });
  });

  describe('prettifyJSONValue', () => {
    it('pretty-prints an already-parsed value', () => {
      expect(prettifyJSONValue({ a: 1 })).toBe('{\n  "a": 1\n}');
    });
  });

  describe('losslessJSONParser', () => {
    it('exposes a JSON-compatible parse/stringify interface', () => {
      expect(typeof losslessJSONParser.parse).toBe('function');
      expect(typeof losslessJSONParser.stringify).toBe('function');
      // Round-trips a trailing-zero number without normalizing it.
      expect(losslessJSONParser.stringify(losslessJSONParser.parse('10.50'))).toBe('10.50');
    });
  });
});
