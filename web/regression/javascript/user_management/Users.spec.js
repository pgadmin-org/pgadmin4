/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////



import { act, render } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { withBrowser } from '../genericFunctions';
import Users from '../../../pgadmin/tools/user_management/static/js/Users';

describe('Users', ()=>{
  let networkMock;

  beforeEach(()=>{
    networkMock = new MockAdapter(axios);
    networkMock.onGet('/user_management/auth_sources').reply(200,
      [{'id':1,'label':'internal','value':'internal'}]
    );
    networkMock.onGet('/user_management/roles').reply(200,
      [
        {'id':1,'name':'Administrator'},
        {'id':2,'name':'User'}
      ],
    );
    networkMock.onGet('/user_management/users').reply(200,
      [{'id':1,'label':'postgres','value':'postgres', 'auth_source': 'internal', 'role': 1}],
    );
  });

  afterEach(() => {
    networkMock.restore();
  });

  describe('Component', ()=>{
    const UsersWithBrowser = withBrowser(Users);

    it('init', async ()=>{
      let ctrl;
      await act(()=>{
        ctrl = render(<UsersWithBrowser roles={[
          { id: 1, name: 'Administrator' },
          { id: 2, name: 'User' },
        ]}/>);
      });
      expect(ctrl.container.querySelectorAll('[data-test="users"]').length).toBe(1);
    });
  });
});
