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
import { FormHelperText, InputLabel } from '@material-ui/core';

import {SelectRefresh} from 'sources/components/SelectRefresh';

/* MUI Components need to be wrapped in Theme for theme vars */
describe('components SelectRefresh', ()=>{
  let mount;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    jasmineEnzyme();
  });

  describe('SelectRefresh', ()=>{
    let ThemedSelectRefresh = withTheme(SelectRefresh), ctrl, onChange=jasmine.createSpy('onChange'),
      ctrlMount = (props)=>{
        ctrl?.unmount();
        ctrl = mount(
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
            {...props}
          />);
      };

    beforeEach(()=>{
      ctrlMount();
    });

    it('accessibility', ()=>{
      expect(ctrl.find(InputLabel)).toHaveProp('htmlFor', 'inpCid');
      expect(ctrl.find(FormHelperText)).toHaveProp('id', 'hinpCid');
    });
  });

});
