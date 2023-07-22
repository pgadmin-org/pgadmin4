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
import MfaValidatePage from '../../../pgadmin/static/js/SecurityPages/MfaValidatePage';

describe('MfaValidatePage', ()=>{
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
      <MfaValidatePage {...props}/>
    </Theme>);
  };

  it('email selected', (done)=>{
    const ctrl = ctrlMount({
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
    setTimeout(()=>{
      ctrl.update();
      expect(ctrl.find('form')).toHaveProp('action', '/mfa/validate');
      expect(ctrl.find('EmailValidateView')).toExist();
      expect(ctrl.find('AuthenticatorValidateView')).not.toExist();
      expect(ctrl.find('button[name="send_code"]')).toExist();
      expect(ctrl.find('input[name="mfa_method"]').instance().value).toBe('email');
      ctrl.unmount();
      done();
    }, 100);
  });

  it('authenticator selected', (done)=>{
    const ctrl = ctrlMount({
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
    setTimeout(()=>{
      ctrl.update();
      expect(ctrl.find('form')).toHaveProp('action', '/mfa/validate');
      expect(ctrl.find('EmailValidateView')).not.toExist();
      expect(ctrl.find('AuthenticatorValidateView')).toExist();
      expect(ctrl.find('input[name="code"]')).toExist();
      expect(ctrl.find('input[name="mfa_method"]').instance().value).toBe('authenticator');
      ctrl.unmount();
      done();
    }, 100);
  });
});
