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
import {TestSchema} from './TestSchema.ui';

import SchemaView from '../../../pgadmin/static/js/SchemaView';
import pgAdmin from '../fake_pgadmin';
import { withBrowser } from '../genericFunctions';
import userEvent from '@testing-library/user-event';

const initData = {
  id: 1,
  field1: 'field1val',
  field2: 1,
  fieldcoll: [
    {field3: 1, field4: 'field4val1', field5: 'field5val1'},
    {field3: 2, field4: 'field4val2', field5: 'field5val2'},
  ],
  field3: 3,
  field4: 'field4val',
};

function getInitData() {
  return Promise.resolve(initData);
}

function getSchema() {
  return new TestSchema();
}

describe('SchemaView', ()=>{
  const SchemaViewWithBrowser = withBrowser(SchemaView);
  const user = userEvent.setup();

  beforeAll(()=>{
    jest.spyOn(pgAdmin.Browser.notifier, 'alert').mockImplementation(() => {});
  });

  describe('SchemaPropertiesView', ()=>{
    let onEdit = jest.fn(),
      onHelp = jest.fn(),
      ctrl = null;

    beforeEach(async ()=>{
      await act(async ()=>{
        ctrl = render(
          <SchemaViewWithBrowser
            formType='tab'
            schema={getSchema()}
            getInitData={getInitData}
            viewHelperProps={{
              mode: 'properties',
            }}
            onHelp={onHelp}
            disableSqlHelp={false}
            onEdit={onEdit}
          />
        );
      });
    });

    it('init', ()=>{
      expect(ctrl.container.querySelectorAll('[data-testid="form-input"]').length).toBe(5);
      expect(ctrl.container.querySelectorAll('.MuiAccordion-root').length).toBe(2);
    });

    it('onHelp', async ()=>{
      await user.click(ctrl.container.querySelector('button[data-test="help"]'));
      expect(onHelp).toHaveBeenCalled();
    });

    it('onEdit', async ()=>{
      await user.click(ctrl.container.querySelector('button[data-test="edit"]'));
      expect(onEdit).toHaveBeenCalled();
    });
  });
});
