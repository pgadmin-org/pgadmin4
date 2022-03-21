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
import QueryThresholds from '../../../pgadmin/static/js/components/QueryThresholds';

/* MUI Components need to be wrapped in Theme for theme vars */
describe('QueryThresholds', () => {
  let mount;
  let defult_value = {
    'warning': 5,
    'alert': 6
  };

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

  describe('QueryThresholds', () => {
    let ThemedFormInputQueryThresholds = withTheme(QueryThresholds), ctrl;

    beforeEach(() => {
      ctrl = mount(
        <ThemedFormInputQueryThresholds
          testcid="inpCid"
          helpMessage="some help message"
          /* InputText */
          readonly={false}
          disabled={false}
          maxlength={1}
          value={defult_value}
          controlProps={{
            extraprop: 'test'
          }}
        />);
    });

    it('init Warning', () => {
      expect(ctrl.find(OutlinedInput).at(0).prop('value')).toBe(5);
    });

    it('init Alert', () => {
      expect(ctrl.find(OutlinedInput).at(1).prop('value')).toBe(6);
    });

    it('warning change', () => {
      let onChange = () => {/*This is intentional (SonarQube)*/ };
      ctrl.setProps({
        onChange: onChange
      });
      expect(ctrl.find(OutlinedInput).at(0).prop('value')).toBe(5);
    });

    it('Alert change', () => {
      let onChange = () => {/*This is intentional (SonarQube)*/ };
      ctrl.setProps({
        onChange: onChange
      });
      expect(ctrl.find(OutlinedInput).at(1).prop('value')).toBe(6);
    });
  });

});
