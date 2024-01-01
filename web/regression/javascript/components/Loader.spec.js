/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import { render, screen } from '@testing-library/react';
import { withTheme } from '../fake_theme';
import Loader from 'sources/components/Loader';


/* MUI Components need to be wrapped in Theme for theme vars */
describe('Loader', ()=>{
  let loaderInst,
    ThemedLoader = withTheme(Loader);

  beforeEach(()=>{
    loaderInst = render(<ThemedLoader message={'loading'} />);
  });

  it('init', ()=>{
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('no message', ()=>{
    loaderInst.rerender(<ThemedLoader message={''} />);
    expect(loaderInst.container).toBeEmptyDOMElement();
  });

  it('change message', ()=>{
    loaderInst.rerender(<ThemedLoader message={'test message'} />);
    expect(screen.getByText('test message')).toBeInTheDocument();
  });
});
