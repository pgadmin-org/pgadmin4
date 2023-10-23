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
import Theme from '../../../pgadmin/static/js/Theme';
import LoginPage from '../../../pgadmin/static/js/SecurityPages/LoginPage';

describe('LoginPage', ()=>{


  let ctrlMount = (props)=>{
    return render(<Theme>
      <LoginPage {...props}/>
    </Theme>);
  };

  it('internal', ()=>{
    const ctrl = ctrlMount({
      userLanguage: 'en',
      langOptions: [{
        label: 'English',
        value: 'en',
      }],
      forgotPassUrl: '/forgot/url',
      csrfToken: 'some-token',
      loginUrl: '/login/url',
      authSources: ['internal'],
      authSourcesEnum: {
        OAUTH2: 'oauth2',
        KERBEROS: 'kerberos'
      },
      oauth2Config: [],
      loginBanner: 'login banner'
    });
    expect(ctrl.container.querySelector('form').getAttribute('action')).toBe('/login/url');
    expect(ctrl.container.querySelector('input[name="email"]')).not.toBeNull();
    expect(ctrl.container.querySelector('input[name="password"]')).not.toBeNull();
  });

  it('oauth2', ()=>{
    const ctrl = ctrlMount({
      userLanguage: 'en',
      langOptions: [{
        label: 'English',
        value: 'en',
      }],
      forgotPassUrl: '/forgot/url',
      csrfToken: 'some-token',
      loginUrl: '/login/url',
      authSources: ['internal', 'oauth2'],
      authSourcesEnum: {
        OAUTH2: 'oauth2',
        KERBEROS: 'kerberos'
      },
      oauth2Config: [{
        OAUTH2_NAME: 'github',
        OAUTH2_BUTTON_COLOR: '#fff',
        OAUTH2_ICON: 'fa-github',
        OAUTH2_DISPLAY_NAME: 'Github'
      }],
      loginBanner: ''
    });
    expect(ctrl.container.querySelector('form').getAttribute('action')).toBe('/login/url');
    expect(ctrl.container.querySelector('input[name="email"]')).not.toBeNull();
    expect(ctrl.container.querySelector('input[name="password"]')).not.toBeNull();
    expect(ctrl.container.querySelector('button[name="oauth2_button"]')).toHaveValue('github');
  });
});
