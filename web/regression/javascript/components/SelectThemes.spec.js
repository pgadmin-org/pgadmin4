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
import { act, render, screen, waitFor } from '@testing-library/react';
import SelectThemes from '../../../pgadmin/static/js/components/SelectThemes';

/* MUI Components need to be wrapped in Theme for theme vars */
describe('SelectThemes', () => {
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

  describe('Select Themes', () => {
    let ThemedFormInputThemes = withTheme(SelectThemes), ctrl, onChange = jest.fn();
    const ctrlRerender = (props)=>{
      ctrl.rerender(
        <ThemedFormInputThemes
          testcid="SelectThemeCid"
          helpMessage="some help message"
          options={options}
          onChange={onChange}
          value={'standard'}
          {...props}
        />);
    };
    beforeEach(async () => {
      await act( async () => {
        ctrl = render(
          <ThemedFormInputThemes
            testcid="SelectThemeCid"
            helpMessage="some help message"
            options={options}
            onChange={onChange}
            value={'standard'}
          />);
      });
    });

    it('init options', () => {
      expect(screen.getByRole('img').getAttribute('src')).toBe(options[0].preview_src);
    });

    it('change value', async () => {
      ctrlRerender({
        value: 'dark',
        onChange: onChange,
      });
      await waitFor(()=>{
        expect(screen.getByRole('img').getAttribute('src')).toBe(options[1].preview_src);
      }, {timeout: 500});
    });
  });
});
