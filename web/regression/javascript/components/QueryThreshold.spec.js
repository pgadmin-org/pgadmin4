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
import QueryThresholds from '../../../pgadmin/static/js/components/QueryThresholds';
import { InputText } from '../../../pgadmin/static/js/components/FormComponents';

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
    let onChange = jasmine.createSpy('onChange');
    beforeEach(() => {
      ctrl = mount(
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

    it('Warning', (done) => {
      ctrl.find(InputText).at(0).find('input').simulate('change', { warning: 5, alert: 6 });
      expect(ctrl.find(InputText).at(0).prop('value')).toBe(5);

      expect(onChange).toHaveBeenCalledWith({ warning: '5', alert: 6 });
      done();
    });

    it('Alert', (done) => {
      ctrl.find(InputText).at(1).find('input').simulate('change', { warning: 5, alert: 6 });
      expect(ctrl.find(InputText).at(1).prop('value')).toBe(6);

      expect(onChange).toHaveBeenCalledWith({ warning: 5, alert: '6' });
      done();
    });
  });

});
