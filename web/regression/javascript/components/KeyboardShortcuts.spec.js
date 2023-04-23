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
import {
  OutlinedInput,
} from '@material-ui/core';
import KeyboardShortcuts from '../../../pgadmin/static/js/components/KeyboardShortcuts';
import { InputCheckbox } from '../../../pgadmin/static/js/components/FormComponents';

/* MUI Components need to be wrapped in Theme for theme vars */
describe('KeyboardShortcuts', () => {
  let mount;
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

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(() => {
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(() => {
    jasmineEnzyme();
  });

  describe('KeyboardShortcuts', () => {
    let ThemedFormInputKeyboardShortcuts = withTheme(KeyboardShortcuts), ctrl;
    let onChange = jasmine.createSpy('onChange');
    beforeEach(() => {
      ctrl = mount(
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
      expect(ctrl.find(OutlinedInput).prop('value')).toBe('a');
    });

    it('Key change', (done) => {
      ctrl.find(OutlinedInput).at(0).find('input').simulate('keydown', { key: '', keyCode: 32});
      expect(onChange).toHaveBeenCalledWith({ control: true, alt: true, key: { char: 'Space', key_code: 32 }, shift: false });
      done();
    });

    it('Shift option', (done) => {
      ctrl.find(InputCheckbox).at(0).find('input').simulate('change', { target: { checked: true, name: 'shift' } });
      expect(onChange).toHaveBeenCalledWith({ control: true, alt: true, key: { char: 'a', key_code: 97 }, shift: true });
      done();
    });

    it('Control option', (done) => {
      ctrl.find(InputCheckbox).at(1).find('input').simulate('change', { target: { checked: false, name: 'ctrl' } });
      expect(onChange).toHaveBeenCalledWith({ control: false, alt: true, key: { char: 'a', key_code: 97 }, shift: false });
      done();
    });


    it('Alt option', (done) => {
      ctrl.find(InputCheckbox).at(2).find('input').simulate('change', { target: { checked: false, name: 'alt' } });
      expect(onChange).toHaveBeenCalledWith({ control: true, alt: false, key: { char: 'a', key_code: 97 }, shift: false });
      done();
    });

  });
});
