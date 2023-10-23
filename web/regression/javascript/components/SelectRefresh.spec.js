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
import { act, render, waitFor } from '@testing-library/react';

import {SelectRefresh} from 'sources/components/SelectRefresh';

/* MUI Components need to be wrapped in Theme for theme vars */
describe('components SelectRefresh', ()=>{
  describe('SelectRefresh', ()=>{
    let ThemedSelectRefresh = withTheme(SelectRefresh), ctrl, onChange=jest.fn();

    beforeEach(async ()=>{
      await act( async () => {
        ctrl = render(
          <ThemedSelectRefresh
            label="First"
            className="someClass"
            testcid="inpCid"
            helpMessage="some help message"
            /* InputSelect */
            readonly={false}
            disabled={false}
            value={1}
            onChange={onChange}
            controlProps={{
              getOptionsOnRefresh: ()=>{/*This is intentional (SonarQube)*/}
            }}
          />);
      });
    });

    it('accessibility', async ()=>{
      await waitFor(()=>{
        const input = ctrl.container.querySelectorAll('input')[1];
        expect(input.getAttribute('id')).toBe('inpCid');
        expect(input.getAttribute('aria-describedby')).toBe('hinpCid');
      }, {timeout: 500});
    });
  });

});
