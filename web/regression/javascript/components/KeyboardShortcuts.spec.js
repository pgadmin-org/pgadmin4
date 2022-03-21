/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
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

/* MUI Components need to be wrapped in Theme for theme vars */
describe('KeyboardShortcuts', () => {
  let mount;
  let defult_value = {
    'ctrl': true,
    'alt': true,
    'key': {
      'char': 'a',
      'key_code': 97
    }
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

    beforeEach(() => {
      ctrl = mount(
        <ThemedFormInputKeyboardShortcuts
          testcid="inpCid"
          helpMessage="some help message"
          /* InputText */
          readonly={false}
          disabled={false}
          maxlength={1}
          value={defult_value}
          fields={fields}
          controlProps={{
            extraprop: 'test'
          }}
        />);
    });

    it('init', () => {
      expect(ctrl.find(OutlinedInput).prop('value')).toBe('a');
    });

    it('Key change', () => {
      let onChange = () => {/*This is intentional (SonarQube)*/ };
      ctrl.setProps({
        controlProps: {
          onKeyDown: onChange
        }
      });

      expect(ctrl.find(OutlinedInput).prop('value')).toBe('a');
    });

  });
});
