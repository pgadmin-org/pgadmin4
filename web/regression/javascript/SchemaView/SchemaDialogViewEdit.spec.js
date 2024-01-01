/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
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

  describe('SchemaDialogView', ()=>{
    let ctrl,
      onSave=jest.fn(() => Promise.resolve()),
      onClose=jest.fn(),
      onHelp=jest.fn(),
      onEdit=jest.fn(),
      onDataChange=jest.fn(),
      getSQLValue=jest.fn(() => Promise.resolve('select 1;')),
      ctrlMount = async (props)=>{
        await act(async ()=>{
          ctrl = render(
            <SchemaViewWithBrowser
              formType='dialog'
              schema={getSchema()}
              viewHelperProps={{
                mode: 'edit',
              }}
              onSave={onSave}
              onClose={onClose}
              onHelp={onHelp}
              onEdit={onEdit}
              onDataChange={onDataChange}
              confirmOnCloseReset={true}
              hasSQL={true}
              getSQLValue={getSQLValue}
              disableSqlHelp={false}
              getInitData={getInitData}
              {...props}
            />
          );
        });
      };

    describe('edit mode', ()=>{
      let simulateChanges = async ()=>{
        await user.clear(ctrl.container.querySelector('[name="field1"]'));
        await user.type(ctrl.container.querySelector('[name="field1"]'), 'val1');
        await user.clear(ctrl.container.querySelector('[name="field5"]'));
        await user.type(ctrl.container.querySelector('[name="field5"]'), 'val5');
        /* Add a row */
        await user.click(ctrl.container.querySelector('[data-test="add-row"]'));
        await user.type(ctrl.container.querySelectorAll('[data-test="data-table-row"] [name="field5"]')[2], 'rval53');
        /* Remove the 1st row */
        let confirmSpy = jest.spyOn(pgAdmin.Browser.notifier, 'confirm');
        confirmSpy.mockClear();
        await user.click(ctrl.container.querySelectorAll('[data-test="delete-row"]')[0]);
        await act(async ()=>{
          confirmSpy.mock.calls[0][2]();
        });

        /* Edit the 2nd row which is first now*/
        await user.type(ctrl.container.querySelectorAll('[data-test="data-table-row"] [name="field5"]')[0], 'rvalnew');
      };
      beforeEach(async ()=>{
        await ctrlMount();
      });
      it('init', ()=>{
        expect(ctrl.container.querySelectorAll('[data-testid="form-input"]').length).toBe(3);
        expect(ctrl.container.querySelectorAll('[data-test="data-table-row"').length).toBe(2);
        expect(ctrl.container.querySelector('[data-test="Reset"]').hasAttribute('disabled')).toBe(true);
        expect(ctrl.container.querySelector('[data-test="Save"]').hasAttribute('disabled')).toBe(true);
      });

      it('onReset after change', async ()=>{
        onDataChange.mockClear();
        await simulateChanges();
        let confirmSpy = jest.spyOn(pgAdmin.Browser.notifier, 'confirm');
        await user.click(ctrl.container.querySelector('[data-test="Reset"]'));
        /* Press OK */
        await act(async ()=>{
          confirmSpy.mock.calls[confirmSpy.mock.calls.length - 1][2]();
        });
        expect(ctrl.container.querySelector('[data-test="Reset"]').hasAttribute('disabled')).toBe(true);
        expect(ctrl.container.querySelector('[data-test="Save"]').hasAttribute('disabled')).toBe(true);
        expect(onDataChange).toHaveBeenCalledWith(false, {});
      });
    });
  });
});
