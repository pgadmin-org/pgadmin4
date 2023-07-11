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
import Theme from '../../../pgadmin/static/js/Theme';
import LoginPage from '../../../pgadmin/static/js/SecurityPages/LoginPage';

describe('LoginPage', ()=>{
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

  let ctrlMount = (props)=>{
    return mount(<Theme>
      <LoginPage {...props}/>
    </Theme>);
  };

  it('internal', (done)=>{
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
    setTimeout(()=>{
      expect(ctrl.find('form')).toHaveProp('action', '/login/url');
      expect(ctrl.find('input[name="email"]')).toExist();
      expect(ctrl.find('input[name="password"]')).toExist();
      ctrl.unmount();
      done();
    }, 100);
  });

  it('oauth2', (done)=>{
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
    setTimeout(()=>{
      expect(ctrl.find('form')).toHaveProp('action', '/login/url');
      expect(ctrl.find('input[name="email"]')).toExist();
      expect(ctrl.find('input[name="password"]')).toExist();
      expect(ctrl.find('button[name="oauth2_button"]')).toHaveProp('value', 'github');
      ctrl.unmount();
      done();
    }, 100);
  });
});
