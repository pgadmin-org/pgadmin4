/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { render } from '@testing-library/react';
import { withTheme } from '../fake_theme';
import TabPanel from 'sources/components/TabPanel';


/* MUI Components need to be wrapped in Theme for theme vars */
describe('TabPanel', ()=>{
  let panelInst, ThemedPanel;

  beforeAll(()=>{
    /* Need Mui Theme context as well */
    ThemedPanel = withTheme(TabPanel);
  });

  beforeEach(()=>{
    panelInst = render(<ThemedPanel value={1} index={0}><h1>test</h1></ThemedPanel>);
  });

  it('init', ()=>{
    expect(panelInst.container.querySelector('[data-test="tabpanel"]').hidden).toBe(true);
  });

  it('tab select', ()=>{
    panelInst.rerender(<ThemedPanel value={0} index={0}><h1>test</h1></ThemedPanel>);
    expect(panelInst.container.querySelector('[data-test="tabpanel"]').hidden).toBe(false);
  });
});
