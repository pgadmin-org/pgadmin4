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
import ForgotPasswordPage from '../../../pgadmin/static/js/SecurityPages/ForgotPasswordPage';

describe('ForgotPasswordPage', ()=>{
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
      <ForgotPasswordPage {...props}/>
    </Theme>);
  };

  it('basic', (done)=>{
    const ctrl = ctrlMount({
      actionUrl: '/forgot/url',
      csrfToken: 'some-token',
    });
    setTimeout(()=>{
      expect(ctrl.find('form')).toHaveProp('action', '/forgot/url');
      expect(ctrl.find('input[name="email"]')).toExist();
      ctrl.unmount();
      done();
    }, 100);
  });
});
