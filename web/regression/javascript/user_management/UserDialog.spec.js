/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { act, render } from '@testing-library/react';
import { withBrowser } from '../genericFunctions';
import UserDialog from '../../../pgadmin/tools/user_management/static/js/UserDialog';

describe('UserDialog', ()=>{
  describe('Component', ()=>{
    const UserDialogWithBrowser = withBrowser(UserDialog);

    it('init', async ()=>{
      let ctrl;
      await act(async ()=>{
        ctrl = await render(<UserDialogWithBrowser
          options={{
            authSources: [{id: 1, label: 'internal', value: 'internal'}],
            roles: [{value: 1, label: 'Administrator'}, {value: 2, label: 'User'}],
          }}
          user={{}}
          onClose={() => {
            // Intentionally left blank
          }}
        />);
      });
      expect(ctrl.container.querySelector('.FormView-nonTabPanel .MuiFormLabel-root').textContent).toBe('Authentication source');
    });
  });
});
