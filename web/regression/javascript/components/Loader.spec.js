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
import { createMount } from '@material-ui/core/test-utils';
import { withTheme } from '../fake_theme';
import Loader from 'sources/components/Loader';


/* MUI Components need to be wrapped in Theme for theme vars */
describe('Loader', ()=>{
  let mount, loaderInst, ThemedLoader;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
    /* Loader need Mui Theme context as well */
    ThemedLoader = withTheme(Loader);
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    jasmineEnzyme();
    loaderInst = mount(<ThemedLoader message={'loading'} />);
  });

  it('init', ()=>{
    expect(loaderInst.find('.MuiTypography-root').text()).toBe('loading');
  });

  it('no message', ()=>{
    loaderInst.setProps({message: ''});
    expect(loaderInst.isEmptyRender()).toBeTruthy();
  });

  it('change message', ()=>{
    loaderInst.setProps({message: 'test message'});
    expect(loaderInst.find('.MuiTypography-root').text()).toBe('test message');
  });
});
