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
import { fireEvent, render, screen } from '@testing-library/react';


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
    beforeEach(() => {
      render(
        <ThemedFormInputKeyboardShortcuts
          value={defult_value}
          fields={fields}
          controlProps={{
            extraprop: 'test',
            keyDown: onChange
          }}
          onChange={onChange}
        />);
    });

    it('init', () => {
      expect(screen.getByRole('textbox').getAttribute('value')).toBe('a');
    });

    it('Key change', () => {
      fireEvent.keyDown(screen.getByRole('textbox'), {
        key: 'Space', code: 32, keyCode: 32
      });
      expect(onChange).toHaveBeenCalledWith({ control: true, alt: true, key: { char: 'Space', key_code: 32 }, shift: false });
    });

    it('Shift option', () => {
      const input = screen.getAllByRole('checkbox').at(0);
      fireEvent.click(input);
      expect(onChange).toHaveBeenCalledWith({ control: true, alt: true, key: { char: 'a', key_code: 97 }, shift: true });
    });

    it('Control option', () => {
      const input = screen.getAllByRole('checkbox').at(1);
      fireEvent.click(input);
      expect(onChange).toHaveBeenCalledWith({ control: false, alt: true, key: { char: 'a', key_code: 97 }, shift: false });
    });


    it('Alt option', () => {
      const input = screen.getAllByRole('checkbox').at(2);
      fireEvent.click(input);
      expect(onChange).toHaveBeenCalledWith({ control: true, alt: false, key: { char: 'a', key_code: 97 }, shift: false });
    });
  });
});
