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
import InfoIcon from '@material-ui/icons/InfoRounded';

import {PrimaryButton, DefaultButton, PgIconButton} from 'sources/components/Buttons';

/* MUI Components need to be wrapped in Theme for theme vars */
describe('components Buttons', ()=>{
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

  it('PrimaryButton', ()=>{
    let ThemedBtn = withTheme(PrimaryButton);
    let btn = mount(<ThemedBtn>Test</ThemedBtn>);
    expect(btn.find('button').getDOMNode().classList.contains('MuiButton-containedPrimary')).toBe(true);
  });

  it('DefaultButton', ()=>{
    let ThemedBtn = withTheme(DefaultButton);
    let btn = mount(<ThemedBtn className="testClass">Test</ThemedBtn>);
    expect(btn.find('button').getDOMNode().classList.contains('MuiButton-outlined')).toBe(true);
    expect(btn.find('button').getDOMNode().classList.contains('testClass')).toBe(true);
  });

  it('PgIconButton', ()=>{
    let Icon = <InfoIcon />;
    let ThemedBtn = withTheme(PgIconButton);
    let btn = mount(<ThemedBtn title="The icon button" icon={Icon} className="testClass"></ThemedBtn>);
    expect(btn.find(InfoIcon)).not.toBe(null);
  });
});
