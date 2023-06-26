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
import PasswordResetPage from '../../../pgadmin/static/js/SecurityPages/PasswordResetPage';

describe('PasswordResetPage', ()=>{


  let ctrlMount = (props)=>{
    return render(<Theme>
      <PasswordResetPage {...props}/>
    </Theme>);
  };

  it('basic', (done)=>{
    const ctrl = ctrlMount({
      actionUrl: '/reset/url',
      csrfToken: 'some-token',
    });
    setTimeout(()=>{
      expect(ctrl.container.querySelector('form').getAttribute('action')).toBe('/reset/url');
      expect(ctrl.container.querySelector('input[name="password"]')).not.toBeNull();
      expect(ctrl.container.querySelector('input[name="password_confirm"]')).not.toBeNull();

      done();
    }, 100);
  });
});
