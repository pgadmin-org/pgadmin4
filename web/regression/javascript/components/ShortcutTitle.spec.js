/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { withTheme } from '../fake_theme';
import { createMount } from '@material-ui/core/test-utils';
import ShortcutTitle, { shortcutToString } from '../../../pgadmin/static/js/components/ShortcutTitle';
import * as keyShort from '../../../pgadmin/static/js/keyboard_shortcuts';

describe('ShortcutTitle', ()=>{
  let mount;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    jasmineEnzyme();
  });

  const shortcut = {
    'control': true,
    'shift': true,
    'alt': false,
    'key': {
      'key_code': 75,
      'char': 'k',
    },
  };
  it('ShortcutTitle', (done)=>{
    let ThemedShortcutTitle = withTheme(ShortcutTitle);
    spyOn(keyShort, 'isMac').and.returnValue(false);
    let ctrl = mount(
      <ThemedShortcutTitle
        title="the title"
        shortcut={shortcut}
      />);
    setTimeout(()=>{
      ctrl.update();
      expect(ctrl.text()).toBe('the titleCtrlShiftK');
      done();
    }, 0);
  });

  describe('shortcutToString', ()=>{
    it('shortcut', ()=>{
      spyOn(keyShort, 'isMac').and.returnValue(false);
      expect(shortcutToString(shortcut)).toBe('Ctrl + Shift + K');
    });

    it('shortcut as array', ()=>{
      spyOn(keyShort, 'isMac').and.returnValue(false);
      expect(shortcutToString(shortcut, null, true)).toEqual(['Ctrl', 'Shift', 'K']);
    });

    it('accesskey', ()=>{
      spyOnProperty(window.navigator, 'userAgent').and.returnValue('Unknown');
      expect(shortcutToString(null, 'A')).toEqual('Accesskey + A');
    });

    it('both null', ()=>{
      expect(shortcutToString(null, null)).toEqual('');
    });

    it('mac meta key', ()=>{
      shortcut.ctrl_is_meta = true;
      spyOn(keyShort, 'isMac').and.returnValue(true);
      expect(shortcutToString(shortcut)).toBe('Cmd + Shift + K');
    });
  });
});
