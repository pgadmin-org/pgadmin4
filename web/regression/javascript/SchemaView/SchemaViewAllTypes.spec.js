/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { act, render } from '@testing-library/react';
import { TestSchemaAllTypes} from './TestSchema.ui';

import SchemaView from '../../../pgadmin/static/js/SchemaView';
import pgAdmin from '../fake_pgadmin';
import { withBrowser } from '../genericFunctions';
import userEvent from '@testing-library/user-event';


function getSchemaAllTypes() {
  return new TestSchemaAllTypes();
}

describe('SchemaView', ()=>{
  const SchemaViewWithBrowser = withBrowser(SchemaView);
  const user = userEvent.setup();

  beforeAll(()=>{
    jest.spyOn(pgAdmin.Browser.notifier, 'alert').mockImplementation(() => {});
  });

  describe('all types', ()=>{
    let ctrl;
    beforeEach(async ()=>{
      await act(async ()=>{
        ctrl = render(
          <SchemaViewWithBrowser
            formType='dialog'
            schema={getSchemaAllTypes()}
            viewHelperProps={{
              mode: 'create',
            }}
            onSave={()=>{/*This is intentional (SonarQube)*/}}
            onClose={()=>{/*This is intentional (SonarQube)*/}}
            onHelp={()=>{/*This is intentional (SonarQube)*/}}
            onEdit={()=>{/*This is intentional (SonarQube)*/}}
            onDataChange={()=>{/*This is intentional (SonarQube)*/}}
            confirmOnCloseReset={false}
            hasSQL={true}
            getSQLValue={()=>'select 1;'}
            disableSqlHelp={false}
          />
        );
      });
    });

    it('init', async ()=>{
      /* Add a row */
      await user.click(ctrl.container.querySelector('[data-test="add-row"]'));
    });
  });
});
