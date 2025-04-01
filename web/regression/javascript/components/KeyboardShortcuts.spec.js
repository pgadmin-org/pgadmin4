/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import { withTheme } from '../fake_theme';
import { fireEvent, render } from '@testing-library/react';

import * as keyShort from '../../../pgadmin/static/js/keyboard_shortcuts';
import KeyboardShortcuts from '../../../pgadmin/static/js/components/KeyboardShortcuts';

/* MUI Components need to be wrapped in Theme for theme vars */
describe('KeyboardShortcuts', () => {
  let defult_value = {
    'control': true,
    'alt': true,
    'key': {
      'char': 'a',
      'key_code': 97
    },
    'shift': false
  };
  let fields = [{
    type: 'keyCode',
    label: 'Key'
  }, {
    name: 'shift',
    label: 'Shift',
    type: 'checkbox'
  },
  {
    name: 'control',
    label: 'Control',
    type: 'checkbox'
  },
  {
    name: 'alt',
    label: 'Alt/Option',
    type: 'checkbox'
  }];

  describe('KeyboardShortcuts', () => {
    let ThemedFormInputKeyboardShortcuts = withTheme(KeyboardShortcuts);
    let onChange = jest.fn();

    const ctrlRender = ()=>{
      return render(
        <ThemedFormInputKeyboardShortcuts
          value={defult_value}
          fields={fields}
          controlProps={{
            extraprop: 'test',
            'keydown': onChange
          }}
          onChange={onChange}
        />);
    };

    beforeAll(()=>{
      jest.spyOn(keyShort, 'isMac').mockReturnValue(true);
    });

    it('init', () => {
      const ctrl = ctrlRender();
      expect(ctrl.container.querySelector('input').getAttribute('value')).toBe('a');
    });

    it('Key change', () => {
      const ctrl = ctrlRender();
      fireEvent.keyDown(ctrl.container.querySelector('input'), {
        key: 'Space', code: 32, keyCode: 32
      });
      expect(onChange).toHaveBeenCalledWith({ control: true, alt: true, key: { char: 'Space', key_code: 32 }, shift: false });
    });

    it('Shift option', () => {
      const ctrl = ctrlRender();
      const input = ctrl.container.querySelectorAll('button')[0];
      fireEvent.click(input);
      expect(onChange).toHaveBeenCalledWith({ control: true, alt: true, key: { char: 'a', key_code: 97 }, shift: true });
    });

    it('Control option', () => {
      const ctrl = ctrlRender();
      const input = ctrl.container.querySelectorAll('button')[1];
      fireEvent.click(input);
      expect(onChange).toHaveBeenCalledWith({ control: false, ctrl_is_meta: false, alt: true, key: { char: 'a', key_code: 97 }, shift: false });
    });

    it('Cmd option', () => {
      const ctrl = ctrlRender();
      const input = ctrl.container.querySelectorAll('button')[2];
      fireEvent.click(input);
      expect(onChange).toHaveBeenCalledWith({ control: true, ctrl_is_meta: true, alt: true, key: { char: 'a', key_code: 97 }, shift: false });
    });

    it('Alt option', () => {
      const ctrl = ctrlRender();
      const input = ctrl.container.querySelectorAll('button')[3];
      fireEvent.click(input);
      expect(onChange).toHaveBeenCalledWith({ control: true, alt: false, key: { char: 'a', key_code: 97 }, shift: false });
    });
  });
});
