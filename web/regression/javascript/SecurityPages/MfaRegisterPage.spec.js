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
import MfaRegisterPage from '../../../pgadmin/static/js/SecurityPages/MfaRegisterPage';

describe('MfaRegisterPage', ()=>{
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
      <MfaRegisterPage {...props}/>
    </Theme>);
  };

  it('email registered', (done)=>{
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
    setTimeout(()=>{
      expect(ctrl.find('form')).toHaveProp('action', '/mfa/register');
      expect(ctrl.find('EmailRegisterView')).not.toExist();
      expect(ctrl.find('AuthenticatorRegisterView')).not.toExist();
      expect(ctrl.find('SecurityButton[value="DELETE"]').length).toBe(1);
      expect(ctrl.find('SecurityButton[value="SETUP"]').length).toBe(1);
      ctrl.unmount();
      done();
    }, 100);
  });

  it('both registered', (done)=>{
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
    setTimeout(()=>{
      expect(ctrl.find('form')).toHaveProp('action', '/mfa/register');
      expect(ctrl.find('EmailRegisterView')).not.toExist();
      expect(ctrl.find('AuthenticatorRegisterView')).not.toExist();
      expect(ctrl.find('SecurityButton[value="DELETE"]').length).toBe(2);
      expect(ctrl.find('SecurityButton[value="SETUP"]').length).toBe(0);
      ctrl.unmount();
      done();
    }, 100);
  });

  it('email view register', (done)=>{
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
    setTimeout(()=>{
      expect(ctrl.find('form')).toHaveProp('action', '/mfa/register');
      expect(ctrl.find('EmailRegisterView')).toExist();
      expect(ctrl.find('input[name="send_to"]')).toExist();
      expect(ctrl.find('AuthenticatorRegisterView')).not.toExist();
      expect(ctrl.find('SecurityButton[value="DELETE"]').length).toBe(0);
      expect(ctrl.find('SecurityButton[value="SETUP"]').length).toBe(0);
      ctrl.unmount();
      done();
    }, 100);
  });

  it('email view otp code', (done)=>{
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
    setTimeout(()=>{
      expect(ctrl.find('form')).toHaveProp('action', '/mfa/register');
      expect(ctrl.find('EmailRegisterView')).toExist();
      expect(ctrl.find('input[name="code"]')).toExist();
      expect(ctrl.find('AuthenticatorRegisterView')).not.toExist();
      expect(ctrl.find('SecurityButton[value="DELETE"]').length).toBe(0);
      expect(ctrl.find('SecurityButton[value="SETUP"]').length).toBe(0);
      ctrl.unmount();
      done();
    }, 100);
  });

  it('authenticator view register', (done)=>{
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
    setTimeout(()=>{
      expect(ctrl.find('form')).toHaveProp('action', '/mfa/register');
      expect(ctrl.find('EmailRegisterView')).not.toExist();
      expect(ctrl.find('AuthenticatorRegisterView')).toExist();
      expect(ctrl.find('input[name="code"]')).toExist();
      expect(ctrl.find('SecurityButton[value="DELETE"]').length).toBe(0);
      expect(ctrl.find('SecurityButton[value="SETUP"]').length).toBe(0);
      ctrl.unmount();
      done();
    }, 100);
  });
});
