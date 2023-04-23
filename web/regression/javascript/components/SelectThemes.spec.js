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
import SelectThemes from '../../../pgadmin/static/js/components/SelectThemes';
import { InputSelect } from '../../../pgadmin/static/js/components/FormComponents';

/* MUI Components need to be wrapped in Theme for theme vars */
describe('SelectThemes', () => {
  let mount;
  let options = [{
    value: 'standard',
    preview_src: 'sd',
    selected: true,
    label: 'Standard'
  }, {
    value: 'dark',
    preview_src: 'test',
    selected: false,
    label: 'Dark'
  },
  {
    value: 'high_contrast',
    preview_src: 'hc',
    selected: false,
    label: 'High Contrast',
  }
  ];

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

  describe('Select Themes', () => {
    let ThemedFormInputThemes = withTheme(SelectThemes), ctrl, onChange = jasmine.createSpy('onChange');

    beforeEach(() => {
      ctrl = mount(
        <ThemedFormInputThemes
          testcid="SelectThemeCid"
          helpMessage="some help message"
          options={options}
          onChange={onChange}
          value={'standard'}
        />);
    });

    it('init options', () => {
      expect(ctrl.find(InputSelect).at(0).prop('options').length).toBe(3);
    });

    it('change value', () => {
      ctrl.setProps({
        value: 'dark',
        onChange: onChange,
      });
      expect(ctrl.find(InputSelect).at(0).prop('value')).toBe('dark');
    });


    it('onChange', () => {
      let select = ctrl.find(InputSelect).at(0);
      const input = select.find('input');
      input.simulate('keyDown', { key: 'ArrowDown', keyCode: 40 });

      input.simulate('keyDown', { key: 'Enter', keyCode: 13 });
      
      ctrl.setProps({
        value: 'dark',
        onChange: onChange,
      });
      expect(ctrl.find(InputSelect).at(0).prop('value')).toBe('dark');
    });
  });

});
