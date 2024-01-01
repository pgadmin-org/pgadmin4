/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { withTheme } from '../fake_theme';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QueryThresholds from '../../../pgadmin/static/js/components/QueryThresholds';

/* MUI Components need to be wrapped in Theme for theme vars */
describe('QueryThresholds', () => {
  let defult_value = {
    'warning': 5,
    'alert': 6
  };

  describe('QueryThresholds', () => {
    let ThemedFormInputQueryThresholds = withTheme(QueryThresholds);
    let onChange = jest.fn();
    beforeEach(() => {
      render(
        <ThemedFormInputQueryThresholds
          testcid="QueryThresholdCid"
          helpMessage="some help message"
          value={defult_value}
          controlProps={{
            extraprop: 'test'
          }}
          onChange={onChange}
        />);
    });

    it('Warning', async () => {
      const user = userEvent.setup();
      const inp = screen.getAllByRole('textbox').at(0);
      await user.type(inp, '7');
      await waitFor(()=>{
        expect(onChange).toHaveBeenCalledWith({ warning: '57', alert: 6 });
      });
    });

    it('Alert', async () => {
      const user = userEvent.setup();
      const inp = screen.getAllByRole('textbox').at(1);
      await user.type(inp, '8');
      await waitFor(()=>{
        expect(onChange).toHaveBeenCalledWith({ warning: 5, alert: '68' });
      });
    });
  });
});
