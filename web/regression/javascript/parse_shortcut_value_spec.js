/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { parseShortcutValue } from 'sources/utils';

describe('parseShortcutValue', function () {
  describe('when short cut is F5', function () {
    it('returns f5', function () {
      expect(parseShortcutValue({
        alt: false,
        control: false,
        shift: false,
        key: {
          char: 'F5',
          key_code: 116,
        },
      })).toEqual('f5');
    });
  });
  describe('when short cut is Alt+Shift+F5', function () {
    it('returns alt+shift+f5', function () {
      expect(parseShortcutValue({
        alt: true,
        control: false,
        shift: true,
        key: {
          char: 'F5',
          key_code: 116,
        },
      })).toEqual('alt+shift+f5');
    });
  });
  describe('when short cut is Alt+Shift+t', function () {
    it('returns alt+shift+t', function () {
      expect(parseShortcutValue({
        alt: true,
        control: false,
        shift: true,
        key: {
          char: 't',
          key_code: 84,
        },
      })).toEqual('alt+shift+t');
    });
  });
  describe('when short cut is Alt+Shift+Ctrl+t', function () {
    it('returns alt+shift+ctrl+t', function () {
      expect(parseShortcutValue({
        alt: true,
        control: true,
        shift: true,
        key: {
          char: 't',
          key_code: 84,
        },
      })).toEqual('alt+shift+ctrl+t');
    });
  });
  describe('when short cut is Alt+Ctrl+t', function () {
    it('returns alt+ctrl+t', function () {
      expect(parseShortcutValue({
        alt: true,
        control: true,
        shift: false,
        key: {
          char: 't',
          key_code: 84,
        },
      })).toEqual('alt+ctrl+t');
    });
  });
  describe('when short cut is Shift+Ctrl+L', function () {
    it('returns shift+ctrl+l', function () {
      expect(parseShortcutValue({
        alt: false,
        control: true,
        shift: true,
        key: {
          char: 'L',
          key_code: 76,
        },
      })).toEqual('shift+ctrl+l');
    });
  });
  describe('when short cut is $', function () {
    it('returns $', function () {
      expect(parseShortcutValue({
        alt: false,
        control: false,
        shift: false,
        key: {
          char: '$',
          key_code: 52,
        },
      })).toEqual('$');
    });
  });
  describe('when short cut is 4', function () {
    it('returns 4', function () {
      expect(parseShortcutValue({
        alt: false,
        control: false,
        shift: false,
        key: {
          char: '4',
          key_code: 52,
        },
      })).toEqual('4');
    });
  });
});
