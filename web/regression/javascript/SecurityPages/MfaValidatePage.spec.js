/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { act, render } from '@testing-library/react';
import Theme from '../../../pgadmin/static/js/Theme';
import MfaValidatePage from '../../../pgadmin/static/js/SecurityPages/MfaValidatePage';

describe('MfaValidatePage', ()=>{


  let ctrlMount = async (props)=>{
    return render(<Theme>
      <MfaValidatePage {...props}/>
    </Theme>);
  };

  it('email selected', async ()=>{
    let ctrl;
    await act(async ()=>{
      ctrl = await ctrlMount({
        actionUrl: '/mfa/validate',
        views: {
          'email': {
            id: 'email',
            label: 'Email',
            icon: '',
            selected: true,
            view: {
              description: 'description',
              otp_placeholder: 'otp_placeholder',
              button_label: 'button_label',
              button_label_sending: 'button_label_sending'
            }
          },
          'authenticator': {
            id: 'authenticator',
            label: 'Authenticator',
            icon: '',
            selected: false,
            view: {
              auth_description: 'auth_description',
              otp_placeholder: 'otp_placeholder',
            }
          }
        },
        logoutUrl: '/logout/url',
        sendEmailUrl: '/send/email',
        csrfHeader: 'csrfHeader',
        csrfToken: 'csrfToken',
      });
    });
    expect(ctrl.container.querySelector('form').getAttribute('action')).toBe('/mfa/validate');
    expect(ctrl.container.querySelector('[data-test="email-validate-view"]')).not.toBeNull();
    expect(ctrl.container.querySelector('[data-test="auth-validate-view"]')).toBeNull();
    expect(ctrl.container.querySelector('input[name="mfa_method"]')).toHaveValue('email');
  });

  it('authenticator selected', async ()=>{
    let ctrl;
    await act(async ()=>{
      ctrl = await ctrlMount({
        actionUrl: '/mfa/validate',
        views: {
          'email': {
            id: 'email',
            label: 'Email',
            icon: '',
            selected: false,
            view: {
              description: 'description',
              otp_placeholder: 'otp_placeholder',
              button_label: 'button_label',
              button_label_sending: 'button_label_sending'
            }
          },
          'authenticator': {
            id: 'authenticator',
            label: 'Authenticator',
            icon: '',
            selected: true,
            view: {
              auth_description: 'auth_description',
              otp_placeholder: 'otp_placeholder',
            }
          }
        },
        logoutUrl: '/logout/url',
        sendEmailUrl: '/send/email',
        csrfHeader: 'csrfHeader',
        csrfToken: 'csrfToken',
      });
    });

    expect(ctrl.container.querySelector('form').getAttribute('action')).toBe('/mfa/validate');
    expect(ctrl.container.querySelector('[data-test="email-validate-view"]')).toBeNull();
    expect(ctrl.container.querySelector('[data-test="auth-validate-view"]')).not.toBeNull();
    expect(ctrl.container.querySelector('input[name="code"]')).not.toBeNull();
    expect(ctrl.container.querySelector('input[name="mfa_method"]')).toHaveValue('authenticator');
  });
});
