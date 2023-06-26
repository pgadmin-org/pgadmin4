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

function getSchema() {
  return new TestSchema();
}

describe('SchemaView', ()=>{
  const SchemaViewWithBrowser = withBrowser(SchemaView);
  const user = userEvent.setup();
  let confirmSpy;

  beforeAll(()=>{
    jest.spyOn(pgAdmin.Browser.notifier, 'alert').mockImplementation(() => {});
    confirmSpy = jest.spyOn(pgAdmin.Browser.notifier, 'confirm');
  });

  describe('SchemaDialogView', ()=>{
    let ctrl,
      onSave=jest.fn(() => Promise.resolve()),
      onClose=jest.fn(),
      onHelp=jest.fn(),
      onEdit=jest.fn(),
      onDataChange=jest.fn(),
      getSQLValue=jest.fn(() => {
        return Promise.resolve('select 1;');
      }),
      ctrlMount = async (props)=>{
        await act(async ()=>{
          ctrl = await render(
            <SchemaViewWithBrowser
              formType='dialog'
              schema={getSchema()}
              viewHelperProps={{
                mode: 'create',
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
              {...props}
            />
          );
        });
      },
      simulateValidData = async ()=>{
        await user.type(ctrl.container.querySelector('[name="field1"]'), 'val1');
        await user.type(ctrl.container.querySelector('[name="field2"]'), '2');
        await user.type(ctrl.container.querySelector('[name="field5"]'), 'val5');
        /* Add a row */
        await user.click(ctrl.container.querySelector('[data-test="add-row"]'));
        await user.click(ctrl.container.querySelector('[data-test="add-row"]'));
        await user.type(ctrl.container.querySelectorAll('[name="field5"]')[0], 'rval51');
        await user.type(ctrl.container.querySelectorAll('[name="field5"]')[1], 'rval52');
      };

    describe('form fields', ()=>{
      beforeEach(async ()=>{
        await ctrlMount({
          getInitData: ()=>Promise.resolve({}),
        });
      });

      it('init', ()=>{
        expect(ctrl.container.querySelectorAll('[data-testid="form-input"]').length).toBe(5);
        expect(ctrl.container.querySelector('[data-test="Reset"]').hasAttribute('disabled')).toBe(true);
        expect(ctrl.container.querySelector('[data-test="Save"]').hasAttribute('disabled')).toBe(true);
      });

      it('change text', async ()=>{
        await user.type(ctrl.container.querySelector('[name="field2"]'), '2');
        /* Error should come for field1 as it is empty and noEmpty true */
        expect(ctrl.container.querySelector('[data-test="notifier-message"]')).toHaveTextContent('\'Field1\' cannot be empty.');
        expect(ctrl.container.querySelector('[data-test="Save"]').hasAttribute('disabled')).toBe(true);
      });

      it('close error on click', async ()=>{
        await user.click(ctrl.container.querySelector('[data-test="notifier-message"] button'));
        expect(ctrl.container.querySelector('[data-test="notifier-message"]')).toBe(null);
      });

      it('valid form data', async ()=>{
        await simulateValidData();
        expect(ctrl.container.querySelector('[data-test="notifier-message"]')).toBe(null);
      });
    });

    describe('DataGridView', ()=>{
      beforeEach(async ()=>{
        await ctrlMount({
          getInitData: ()=>Promise.resolve({}),
        });
      });

      it('add row', async ()=>{
        await simulateValidData();
        await user.click(ctrl.container.querySelector('[data-test="add-row"]'));
        expect(ctrl.container.querySelectorAll('[data-test="data-table-row"]').length).toBe(3);
      });

      it('remove row OK', async ()=>{
        await simulateValidData();
        /* Press OK */
        confirmSpy.mockClear();
        await user.click(ctrl.container.querySelector('[data-test="delete-row"]'));
        await act(async ()=>{
          await new Promise(resolve => setTimeout(resolve));
          confirmSpy.mock.calls[0][2]();
        });
        expect(confirmSpy.mock.calls[0][0]).toBe('Custom delete title');
        expect(confirmSpy.mock.calls[0][1]).toBe('Custom delete message');
      });

      it('remove row Cancel', async ()=>{
        await simulateValidData();
        /* Press Cancel */
        confirmSpy.mockClear();
        await user.click(ctrl.container.querySelector('[data-test="delete-row"]'));
        await act(async ()=>{
          await new Promise(resolve => setTimeout(resolve));
          confirmSpy.mock.calls[0][3]();
        });
        expect(ctrl.container.querySelector('[data-test="notifier-message"]')).toBe(null);
      });

      it('expand row', async ()=>{
        await simulateValidData();
        await user.click(ctrl.container.querySelector('[data-test="expand-row"]'));
        expect(ctrl.container.querySelectorAll('[data-test="data-grid-view"] [data-test="form-view"]').length).toBe(1);
      });

      it('unique col test', async ()=>{
        await simulateValidData();
        await user.clear(ctrl.container.querySelectorAll('[name="field5"]')[1]);
        await user.type(ctrl.container.querySelectorAll('[name="field5"]')[1], 'rval51');
        expect(ctrl.container.querySelector('[data-test="notifier-message"]')).toHaveTextContent('Field5 in FieldColl must be unique.');
      });
    });

    describe('SQL tab', ()=>{
      beforeEach(async ()=>{
        await ctrlMount({
          getInitData: ()=>Promise.resolve({}),
        });
      });

      it('no changes', async ()=>{
        await user.click(ctrl.container.querySelector('button[data-test="SQL"]'));
        expect(ctrl.container.querySelector('[data-testid="SQL"] textarea')).toHaveValue('-- No updates.');
      });

      it('data invalid', async ()=>{
        await user.clear(ctrl.container.querySelector('[name="field2"]'));
        await user.type(ctrl.container.querySelector('[name="field2"]'), '2');
        await user.click(ctrl.container.querySelector('button[data-test="SQL"]'));
        expect(ctrl.container.querySelector('[data-testid="SQL"] textarea')).toHaveValue('-- Definition incomplete.');
      });

      it('valid data', async ()=>{
        await simulateValidData();
        await user.click(ctrl.container.querySelector('button[data-test="SQL"]'));
        expect(ctrl.container.querySelector('[data-testid="SQL"] textarea')).toHaveValue('select 1;');
      });
    });

    describe('others', ()=>{
      beforeEach(async ()=>{
        await ctrlMount({
          getInitData: ()=>Promise.resolve({}),
        });
      });

      it('onSave click', async ()=>{
        await simulateValidData();
        onSave.mockClear();
        await user.click(ctrl.container.querySelector('button[data-test="Save"]'));
        expect(onSave.mock.calls[0][0]).toBe(true);
        expect(onSave.mock.calls[0][1]).toEqual({
          id: undefined,
          field1: 'val1',
          field2: '2',
          field5: 'val5',
          fieldcoll: [
            {field3: null, field4: null, field5:  'rval51'},
            {field3: null, field4: null, field5:  'rval52'},
          ]
        });
        expect(pgAdmin.Browser.notifier.alert).toHaveBeenCalledWith('Warning', 'some inform text');
      });

      it('onHelp SQL', async ()=>{
        await user.click(ctrl.container.querySelector('[data-test="sql-help"]'));
        expect(onHelp).toHaveBeenCalledWith(true, true);
      });

      it('onHelp Dialog', async ()=>{
        await user.click(ctrl.container.querySelector('[data-test="dialog-help"]'));
        expect(onHelp).toHaveBeenCalledWith(false, true);
      });
    });

    describe('onReset', ()=>{
      let onResetAction = (data)=> {
        expect(ctrl.container.querySelector('[data-test="Reset"]').hasAttribute('disabled')).toBe(true);
        expect(ctrl.container.querySelector('[data-test="Save"]').hasAttribute('disabled')).toBe(true);
        expect(onDataChange).toHaveBeenCalledWith(false, data);
      };

      beforeEach(async ()=>{
        await ctrlMount({
          getInitData: ()=>Promise.resolve({}),
        });
      });

      it('with confirm check and yes click', async ()=>{
        await simulateValidData();
        onDataChange.mockClear();
        confirmSpy.mockClear();
        await user.click(ctrl.container.querySelector('button[data-test="Reset"]'));
        /* Press OK */
        await act(async ()=>{
          await new Promise(resolve => setTimeout(resolve));
          confirmSpy.mock.calls[0][2]();
        });
        onResetAction({ id: undefined, field1: null, field2: null, fieldcoll: null });
      });

      it('with confirm check and cancel click', async ()=>{
        await simulateValidData();
        confirmSpy.mockClear();
        await user.click(ctrl.container.querySelector('button[data-test="Reset"]'));
        /* Press cancel */
        await act(async ()=>{
          await new Promise(resolve => setTimeout(resolve));
          confirmSpy.mock.calls[0][3]();
        });
        expect(ctrl.container.querySelector('[data-test="Reset"]').hasAttribute('disabled')).toBe(false);
        expect(ctrl.container.querySelector('[data-test="Save"]').hasAttribute('disabled')).toBe(false);
      });


      it('no confirm check', async ()=>{
        await ctrlMount({
          confirmOnCloseReset: false,
        });

        await simulateValidData();
        onDataChange.mockClear();
        confirmSpy.mockClear();
        await user.click(ctrl.container.querySelector('button[data-test="Reset"]'));
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(ctrl.container.querySelector('[data-test="Reset"]').hasAttribute('disabled')).toBe(true);
        expect(ctrl.container.querySelector('[data-test="Save"]').hasAttribute('disabled')).toBe(true);
        // on reset, orig data will be considered
        expect(onDataChange).toHaveBeenCalledWith(false, { id: undefined, field1: null, field2: null, fieldcoll: null });
      });
    });
  });
});
