/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { render } from '@testing-library/react';
import Theme from '../../../pgadmin/static/js/Theme';
import MfaRegisterPage from '../../../pgadmin/static/js/SecurityPages/MfaRegisterPage';

describe('MfaRegisterPage', ()=>{


  let ctrlMount = (props)=>{
    return render(<Theme>
      <MfaRegisterPage {...props}/>
    </Theme>);
  };

  it('email registered', ()=>{
    const ctrl = ctrlMount({
      actionUrl: '/mfa/register',
      mfaList: [{
        label: 'Email',
        icon: '',
        registered: true,
      },{
        label: 'Authenticator',
        icon: '',
        registered: false,
      }],
      nextUrl: '',
      mfaView: null,
    });
    expect(ctrl.container.querySelector('form').getAttribute('action')).toBe('/mfa/register');
    expect(ctrl.container.querySelector('[data-test="email-register-view"]')).toBeNull();
    expect(ctrl.container.querySelector('[data-test="auth-register-view"]')).toBeNull();
    expect(ctrl.container.querySelectorAll('button[value="DELETE"]').length).toBe(1);
    expect(ctrl.container.querySelectorAll('button[value="SETUP"]').length).toBe(1);
  });

  it('both registered', ()=>{
    const ctrl = ctrlMount({
      actionUrl: '/mfa/register',
      mfaList: [{
        label: 'Email',
        icon: '',
        registered: true,
      },{
        label: 'Authenticator',
        icon: '',
        registered: true,
      }],
      nextUrl: '',
      mfaView: null,
    });
    expect(ctrl.container.querySelector('form').getAttribute('action')).toBe('/mfa/register');
    expect(ctrl.container.querySelector('[data-test="email-register-view"]')).toBeNull();
    expect(ctrl.container.querySelector('[data-test="auth-register-view"]')).toBeNull();
    expect(ctrl.container.querySelectorAll('button[value="DELETE"]').length).toBe(2);
    expect(ctrl.container.querySelectorAll('button[value="SETUP"]').length).toBe(0);
  });

  it('email view register', ()=>{
    const ctrl = ctrlMount({
      actionUrl: '/mfa/register',
      mfaList: [{
        label: 'Email',
        icon: '',
        registered: false,
      },{
        label: 'Authenticator',
        icon: '',
        registered: false,
      }],
      nextUrl: '',
      mfaView: {
        label: 'email_authentication_label',
        auth_method: 'email',
        description:'Enter the email address to send a code',
        email_address_placeholder:'Email address',
        email_address:'email@test.com',
        note_label:'Note',
        note:'This email address will only be used for two factor'
      },
    });
    expect(ctrl.container.querySelector('form').getAttribute('action')).toBe('/mfa/register');
    expect(ctrl.container.querySelector('[data-test="email-register-view"]')).not.toBeNull();
    expect(ctrl.container.querySelector('input[name="send_to"]')).not.toBeNull();
    expect(ctrl.container.querySelector('[data-test="auth-register-view"]')).toBeNull();
    expect(ctrl.container.querySelectorAll('button[value="DELETE"]').length).toBe(0);
    expect(ctrl.container.querySelectorAll('button[value="SETUP"]').length).toBe(0);
  });

  it('email view otp code', ()=>{
    const ctrl = ctrlMount({
      actionUrl: '/mfa/register',
      mfaList: [{
        label: 'Email',
        icon: '',
        registered: false,
      },{
        label: 'Authenticator',
        icon: '',
        registered: false,
      }],
      nextUrl: '',
      mfaView: {
        label: 'email_authentication_label',
        auth_method: 'email',
        description:'Enter the email address to send a code',
        otp_placeholder:'Enter OTP',
        email_address:'email@test.com',
        note_label:'Note',
        note:'This email address will only be used for two factor'
      },
    });
    expect(ctrl.container.querySelector('form').getAttribute('action')).toBe('/mfa/register');
    expect(ctrl.container.querySelector('[data-test="email-register-view"]')).not.toBeNull();
    expect(ctrl.container.querySelector('input[name="code"]')).not.toBeNull();
    expect(ctrl.container.querySelector('[data-test="auth-register-view"]')).toBeNull();
    expect(ctrl.container.querySelectorAll('button[value="DELETE"]').length).toBe(0);
    expect(ctrl.container.querySelectorAll('button[value="SETUP"]').length).toBe(0);
  });

  it('authenticator view register', ()=>{
    const ctrl = ctrlMount({
      actionUrl: '/mfa/register',
      mfaList: [{
        label: 'Email',
        icon: '',
        registered: false,
      },{
        label: 'Authenticator',
        icon: '',
        registered: false,
      }],
      nextUrl: '',
      mfaView: {
        auth_title:'_TOTP_AUTHENTICATOR',
        auth_method: 'authenticator',
        image: 'image',
        qrcode_alt_text: 'TOTP Authenticator QRCode',
        auth_description: 'Scan the QR code and the enter the code',
        otp_placeholder: 'Enter code'
      },
    });

    expect(ctrl.container.querySelector('form').getAttribute('action')).toBe('/mfa/register');
    expect(ctrl.container.querySelector('[data-test="email-register-view"]')).toBeNull();
    expect(ctrl.container.querySelector('input[name="code"]')).not.toBeNull();
    expect(ctrl.container.querySelector('[data-test="auth-register-view"]')).not.toBeNull();
    expect(ctrl.container.querySelectorAll('button[value="DELETE"]').length).toBe(0);
    expect(ctrl.container.querySelectorAll('button[value="SETUP"]').length).toBe(0);
  });
});
