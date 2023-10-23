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
import InfoIcon from '@material-ui/icons/InfoRounded';

import {PrimaryButton, DefaultButton, PgIconButton} from 'sources/components/Buttons';
import { render, screen } from '@testing-library/react';

/* MUI Components need to be wrapped in Theme for theme vars */
describe('components Buttons', ()=>{
  it('PrimaryButton', ()=>{
    let ThemedBtn = withTheme(PrimaryButton);
    render(<ThemedBtn>Test</ThemedBtn>);
    expect(screen.getByRole('button').classList.contains('MuiButton-containedPrimary')).toBe(true);
  });

  it('DefaultButton', ()=>{
    let ThemedBtn = withTheme(DefaultButton);
    render(<ThemedBtn className="testClass">Test</ThemedBtn>);
    const btn = screen.getByRole('button');
    expect(btn.classList.contains('MuiButton-outlined')).toBe(true);
    expect(btn.classList.contains('testClass')).toBe(true);
  });

  it('PgIconButton', ()=>{
    let Icon = <InfoIcon data-testid="info-icon" />;
    let ThemedBtn = withTheme(PgIconButton);
    render(<ThemedBtn title="The icon button" icon={Icon} className="testClass"></ThemedBtn>);
    expect(screen.getByTestId('info-icon')).not.toBe(null);
  });
});
