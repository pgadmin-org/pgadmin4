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
import TabPanel from 'sources/components/TabPanel';


/* MUI Components need to be wrapped in Theme for theme vars */
describe('TabPanel', ()=>{
  let mount, panelInst, ThemedPanel;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
    /* Need Mui Theme context as well */
    ThemedPanel = withTheme(TabPanel);
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    jasmineEnzyme();
    panelInst = mount(<ThemedPanel value={1} index={0}><h1>test</h1></ThemedPanel>);
  });

  it('init', ()=>{
    expect(panelInst.find('div').at(0).getDOMNode().hidden).toBeTrue();
    expect(panelInst.find('h1')).not.toBe(null);
  });

  it('tab select', ()=>{
    panelInst.setProps({value: 0});
    expect(panelInst.find('div').at(0).getDOMNode().hidden).toBeFalse();
  });
});
