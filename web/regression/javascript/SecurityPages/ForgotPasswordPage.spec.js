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
import ForgotPasswordPage from '../../../pgadmin/static/js/SecurityPages/ForgotPasswordPage';

describe('ForgotPasswordPage', ()=>{
  let ctrlMount = (props)=>{
    return render(<Theme>
      <ForgotPasswordPage {...props}/>
    </Theme>);
  };

  it('basic', ()=>{
    const ctrl = ctrlMount({
      actionUrl: '/forgot/url',
      csrfToken: 'some-token',
    });
    expect(ctrl.container.querySelector('form').getAttribute('action')).toBe('/forgot/url');
    expect(ctrl.container.querySelector('input[name="email"]')).not.toBeNull();
  });
});
