/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { withTheme } from '../fake_theme';
import { render } from '@testing-library/react';
import ShortcutTitle, { shortcutToString } from '../../../pgadmin/static/js/components/ShortcutTitle';
import * as keyShort from '../../../pgadmin/static/js/keyboard_shortcuts';

describe('ShortcutTitle', ()=>{
  const shortcut = {
    'control': true,
    'shift': true,
    'alt': false,
    'key': {
      'key_code': 75,
      'char': 'k',
    },
  };
  it('ShortcutTitle', ()=>{
    let ThemedShortcutTitle = withTheme(ShortcutTitle);
    jest.spyOn(keyShort, 'isMac').mockReturnValue(false);
    let ctrl = render(
      <ThemedShortcutTitle
        title="the title"
        shortcut={shortcut}
      />);
    expect(ctrl.container.textContent).toBe('the titleCtrlShiftK');
  });

  describe('shortcutToString', ()=>{
    it('shortcut', ()=>{
      jest.spyOn(keyShort, 'isMac').mockReturnValue(false);
      expect(shortcutToString(shortcut)).toBe('Ctrl + Shift + K');
    });

    it('shortcut as array', ()=>{
      jest.spyOn(keyShort, 'isMac').mockReturnValue(false);
      expect(shortcutToString(shortcut, null, true)).toEqual(['Ctrl', 'Shift', 'K']);
    });

    it('accesskey', ()=>{
      jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Unknown');
      expect(shortcutToString(null, 'A')).toEqual('Accesskey + A');
    });

    it('both null', ()=>{
      expect(shortcutToString(null, null)).toEqual('');
    });

    it('mac meta key', ()=>{
      shortcut.ctrl_is_meta = true;
      jest.spyOn(keyShort, 'isMac').mockReturnValue(true);
      expect(shortcutToString(shortcut)).toBe('Cmd + Shift + K');
    });
  });
});
