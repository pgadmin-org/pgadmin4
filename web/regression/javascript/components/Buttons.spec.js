/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import { withTheme } from '../fake_theme';
import InfoIcon from '@mui/icons-material/InfoRounded';


import {PrimaryButton, DefaultButton, PgIconButton} from 'sources/components/Buttons';
import { render, screen } from '@testing-library/react';

/* MUI Components need to be wrapped in Theme for theme vars */
describe('components Buttons', ()=>{
  it('PrimaryButton', ()=>{
    let ThemedBtn = withTheme(PrimaryButton);
    render(<ThemedBtn>Test</ThemedBtn>);
    // MUI v9 split variant+color into separate classes (was MuiButton-containedPrimary).
    const btn = screen.getByRole('button');
    expect(btn.classList.contains('MuiButton-contained')).toBe(true);
    expect(btn.classList.contains('MuiButton-colorPrimary')).toBe(true);
  });

  it('DefaultButton', ()=>{
    let ThemedBtn = withTheme(DefaultButton);
    render(<ThemedBtn className="testClass">Test</ThemedBtn>);
    const btn = screen.getByRole('button');
    expect(btn.classList.contains('MuiButton-outlined')).toBe(false);
    expect(btn.classList.contains('testClass')).toBe(true);
  });

  it('PgIconButton', ()=>{
    let Icon = <InfoIcon data-testid="info-icon" />;
    let ThemedBtn = withTheme(PgIconButton);
    render(<ThemedBtn title="The icon button" icon={Icon} className="testClass"></ThemedBtn>);
    expect(screen.getByTestId('info-icon')).not.toBe(null);
  });
});
