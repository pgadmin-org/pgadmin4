/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import {TestSchema, TestSchemaAllTypes} from './TestSchema.ui';
import pgAdmin from 'sources/pgadmin';
import {messages} from '../fake_messages';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import * as legacyConnector from 'sources/helpers/legacyConnector';
import Notify from '../../../pgadmin/static/js/helpers/Notifier';

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

function getSchemaAllTypes() {
  return new TestSchemaAllTypes();
}

describe('SchemaView', ()=>{
  let mount;
  let numberChangeEvent = (value)=>{
    return {
      target: {
        value: value,
        validity: {
          valid: true,
        }
      }
    };
  };

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
    spyOn(Notify, 'alert');
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    jasmineEnzyme();
    /* messages used by validators */
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
  });

  describe('SchemaDialogView', ()=>{
    let ctrl,
      onSave=jasmine.createSpy('onSave').and.returnValue(Promise.resolve()),
      onClose=jasmine.createSpy('onClose'),
      onHelp=jasmine.createSpy('onHelp'),
      onEdit=jasmine.createSpy('onEdit'),
      onDataChange=jasmine.createSpy('onDataChange'),
      getSQLValue=jasmine.createSpy('onEdit').and.returnValue(Promise.resolve('select 1;')),
      ctrlMount = (props)=>{
        ctrl?.unmount();
        ctrl = mount(<SchemaView
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
        />);
      },
      simulateValidData = ()=>{
        ctrl.find('MappedFormControl[id="field1"]').find('input').simulate('change', {target: {value: 'val1'}});
        ctrl.find('MappedFormControl[id="field2"]').find('input').simulate('change', numberChangeEvent('2'));
        ctrl.find('MappedFormControl[id="field5"]').find('textarea').simulate('change', {target: {value: 'val5'}});
        /* Add a row */
        ctrl.find('DataGridView').find('PgIconButton[data-test="add-row"]').find('button').simulate('click');
        ctrl.find('DataGridView').find('PgIconButton[data-test="add-row"]').find('button').simulate('click');
        ctrl.find('MappedCellControl[id="field5"]').at(0).find('input').simulate('change', {target: {value: 'rval51'}});
        ctrl.find('MappedCellControl[id="field5"]').at(1).find('input').simulate('change', {target: {value: 'rval52'}});
      };
    beforeEach(()=>{
      ctrlMount();
    });

    it('init', (done)=>{
      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find('MappedFormControl').length).toBe(6);
        expect(ctrl.find('FormView').length).toBe(2);
        expect(ctrl.find('DataGridView').length).toBe(1);
        expect(ctrl.find('DefaultButton[data-test="Reset"]').prop('disabled')).toBeTrue();
        expect(ctrl.find('PrimaryButton[data-test="Save"]').prop('disabled')).toBeTrue();

        done();
      }, 0);
    });

    it('change text', (done)=>{
      ctrl.find('MappedFormControl[id="field2"]').find('input').simulate('change', numberChangeEvent('2'));
      setTimeout(()=>{
        ctrl.update();
        /* Error should come for field1 as it is empty and noEmpty true */
        expect(ctrl.find('FormFooterMessage').prop('message')).toBe('\'Field1\' cannot be empty.');
        expect(ctrl.find('PrimaryButton[data-test="Save"]').prop('disabled')).toBeTrue();
        done();
      }, 0);
    });

    it('close error on click', (done)=>{
      ctrl.find('FormFooterMessage').find('button').simulate('click');
      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find('FormFooterMessage').prop('message')).toBe('');
        done();
      }, 0);
    });

    it('valid form data', (done)=>{
      simulateValidData();
      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find('FormFooterMessage').prop('message')).toBeFalsy();
        done();
      }, 0);
    });

    describe('DataGridView', ()=>{
      it('add row', (done)=>{
        ctrl.find('DataGridView').find('PgIconButton[data-test="add-row"]').find('button').simulate('click');
        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('DataGridView').find('DataTableRow').length).toBe(1);
          done();
        }, 0);
      });

      it('remove row', (done)=>{
        simulateValidData();

        /* Press OK */
        let confirmSpy = spyOn(legacyConnector, 'confirmDeleteRow').and.callFake((yesFn)=>{
          yesFn();
        });
        ctrl.find('DataGridView').find('PgIconButton[data-test="delete-row"]').at(0).find('button').simulate('click');
        expect(confirmSpy.calls.argsFor(0)[2]).toBe('Custom delete title');
        expect(confirmSpy.calls.argsFor(0)[3]).toBe('Custom delete message');

        /* Press Cancel */
        spyOn(legacyConnector, 'confirmDeleteRow').and.callFake((yesFn, cancelFn)=>{
          cancelFn();
        });
        ctrl.find('DataGridView').find('PgIconButton[data-test="delete-row"]').at(0).find('button').simulate('click');
        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('DataGridView').find('DataTableRow').length).toBe(1);
          done();
        }, 0);
      });

      it('expand row', (done)=>{
        simulateValidData();
        ctrl.find('DataGridView').find('PgIconButton[data-test="expand-row"]').at(0).find('button').simulate('click');
        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('DataGridView').find('FormView').length).toBe(1);
          done();
        }, 0);
      });

      it('unique col test', (done)=>{
        simulateValidData();
        ctrl.find('MappedCellControl[id="field5"]').at(1).find('input').simulate('change', {target: {value: 'rval51'}});
        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('FormFooterMessage').prop('message')).toBe('Field5 in FieldColl must be unique.');
          done();
        }, 0);
      });
    });

    describe('SQL tab', ()=>{
      it('no changes', (done)=>{
        ctrl.find('ForwardRef(Tab)[label="SQL"]').find('button').simulate('click');
        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('CodeMirror').prop('value')).toBe('-- No updates.');
          done();
        }, 0);
      });

      it('data invalid', (done)=>{
        ctrl.find('MappedFormControl[id="field2"]').find('input').simulate('change', numberChangeEvent('2'));
        ctrl.find('ForwardRef(Tab)[label="SQL"]').find('button').simulate('click');
        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('CodeMirror').prop('value')).toBe('-- Definition incomplete.');
          done();
        }, 0);
      });

      it('valid data', (done)=>{
        simulateValidData();
        ctrl.find('ForwardRef(Tab)[label="SQL"]').find('button').simulate('click');
        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('CodeMirror').prop('value')).toBe('select 1;');
          done();
        }, 0);
      });
    });

    it('onSave click', (done)=>{
      simulateValidData();
      onSave.calls.reset();
      ctrl.find('PrimaryButton[data-test="Save"]').simulate('click');
      setTimeout(()=>{
        expect(onSave.calls.argsFor(0)[0]).toBe(true);
        expect(onSave.calls.argsFor(0)[1]).toEqual({
          id: undefined,
          field1: 'val1',
          field2: '2',
          field5: 'val5',
          fieldcoll: [
            {field3: null, field4: null, field5:  'rval51'},
            {field3: null, field4: null, field5:  'rval52'},
          ]
        });
        expect(Notify.alert).toHaveBeenCalledWith('Warning', 'some inform text');
        done();
      }, 0);
    });

    describe('onReset', ()=>{
      it('with confirm check and yes click', (done)=>{
        simulateValidData();
        onDataChange.calls.reset();
        let confirmSpy = spyOn(Notify, 'confirm').and.callThrough();
        ctrl.find('DefaultButton[data-test="Reset"]').simulate('click');
        /* Press OK */
        confirmSpy.calls.argsFor(0)[2]();
        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('DefaultButton[data-test="Reset"]').prop('disabled')).toBeTrue();
          expect(ctrl.find('PrimaryButton[data-test="Save"]').prop('disabled')).toBeTrue();
          expect(onDataChange).toHaveBeenCalledWith(false, {});
          done();
        }, 0);
      });

      it('with confirm check and cancel click', (done)=>{
        simulateValidData();
        let confirmSpy = spyOn(Notify, 'confirm').and.callThrough();
        ctrl.find('DefaultButton[data-test="Reset"]').simulate('click');
        /* Press cancel */
        confirmSpy.calls.argsFor(0)[3]();
        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('DefaultButton[data-test="Reset"]').prop('disabled')).toBeFalse();
          expect(ctrl.find('PrimaryButton[data-test="Save"]').prop('disabled')).toBeFalse();
          done();
        }, 0);
      });


      it('no confirm check', (done)=>{
        ctrlMount({
          confirmOnCloseReset: false,
        });
        ctrl.update();
        simulateValidData();
        onDataChange.calls.reset();
        let confirmSpy = spyOn(Notify, 'confirm').and.callThrough();
        ctrl.find('DefaultButton[data-test="Reset"]').simulate('click');
        setTimeout(()=>{
          ctrl.update();
          expect(confirmSpy).not.toHaveBeenCalled();
          expect(ctrl.find('DefaultButton[data-test="Reset"]').prop('disabled')).toBeTrue();
          expect(ctrl.find('PrimaryButton[data-test="Save"]').prop('disabled')).toBeTrue();
          expect(onDataChange).toHaveBeenCalledWith(false, {});
          done();
        }, 0);
      });
    });

    it('onHelp SQL', (done)=>{
      ctrl.find('PgIconButton[data-test="sql-help"]').find('button').simulate('click');
      setTimeout(()=>{
        ctrl.update();
        expect(onHelp).toHaveBeenCalledWith(true, true);
        done();
      }, 0);
    });

    it('onHelp Dialog', (done)=>{
      ctrl.find('PgIconButton[data-test="dialog-help"]').find('button').simulate('click');
      setTimeout(()=>{
        ctrl.update();
        expect(onHelp).toHaveBeenCalledWith(false, true);
        done();
      }, 0);
    });

    describe('edit mode', ()=>{
      let simulateChanges = ()=>{
        ctrl.find('MappedFormControl[id="field1"]').find('input').simulate('change', {target: {value: 'val1'}});
        ctrl.find('MappedFormControl[id="field5"]').find('textarea').simulate('change', {target: {value: 'val5'}});

        /* Add a row */
        ctrl.find('DataGridView').find('PgIconButton[data-test="add-row"]').find('button').simulate('click');
        ctrl.find('MappedCellControl[id="field5"]').at(2).find('input').simulate('change', {target: {value: 'rval53'}});

        /* Remove the 1st row */
        ctrl.find('DataTableRow').find('PgIconButton[data-test="delete-row"]').at(0).find('button').simulate('click');

        /* Edit the 2nd row which is first now*/
        ctrl.find('MappedCellControl[id="field5"]').at(0).find('input').simulate('change', {target: {value: 'rvalnew'}});

      };
      beforeEach(()=>{
        ctrlMount({
          getInitData: getInitData,
          viewHelperProps: {
            mode: 'edit',
          }
        });

        /* Press OK */
        spyOn(legacyConnector, 'confirmDeleteRow').and.callFake((yesFn)=>{
          yesFn();
        });
      });
      it('init', (done)=>{
        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('MappedFormControl').length).toBe(4);
          expect(ctrl.find('FormView').length).toBe(2);
          expect(ctrl.find('DataGridView').length).toBe(1);
          expect(ctrl.find('DataTableRow').length).toBe(2);
          expect(ctrl.find('DefaultButton[data-test="Reset"]').prop('disabled')).toBeTrue();
          expect(ctrl.find('PrimaryButton[data-test="Save"]').prop('disabled')).toBeTrue();

          done();
        }, 0);
      });

      it('onSave after change', (done)=>{
        setTimeout(()=>{
          ctrl.update();
          simulateChanges();

          onSave.calls.reset();
          ctrl.find('PrimaryButton[data-test="Save"]').simulate('click');
          setTimeout(()=>{
            ctrl.update();
            expect(onSave.calls.argsFor(0)[0]).toBe(false);
            expect(onSave.calls.argsFor(0)[1]).toEqual({
              id: 1,
              field1: 'val1',
              field5: 'val5',
              fieldcoll: {
                added: [
                  { field3: null, field4: null, field5: 'rval53'}
                ],
                changed: [
                  { field3: 2, field4: 'field4val2', field5: 'rvalnew'}
                ],
                deleted: [
                  { field3: 1, field4: 'field4val1', field5: 'field5val1'}
                ]
              }
            });
            expect(Notify.alert).toHaveBeenCalledWith('Warning', 'some inform text');
            done();
          }, 0);
        }, 0);
      });

      it('onReset after change', (done)=>{
        setTimeout(()=>{
          ctrl.update();
          simulateChanges();
          onDataChange.calls.reset();
          let confirmSpy = spyOn(Notify, 'confirm').and.callThrough();
          ctrl.find('DefaultButton[data-test="Reset"]').simulate('click');
          /* Press OK */
          confirmSpy.calls.argsFor(0)[2]();
          setTimeout(()=>{
            ctrl.update();
            expect(ctrl.find('DefaultButton[data-test="Reset"]').prop('disabled')).toBeTrue();
            expect(ctrl.find('PrimaryButton[data-test="Save"]').prop('disabled')).toBeTrue();
            expect(onDataChange).toHaveBeenCalledWith(false, {});
            done();
          }, 0);
        }, 0);
      });
    });
  });

  describe('all types', ()=>{
    let ctrl;
    beforeEach(()=>{
      ctrl?.unmount();
      ctrl = mount(<SchemaView
        formType='dialog'
        schema={getSchemaAllTypes()}
        viewHelperProps={{
          mode: 'create',
        }}
        onSave={()=>{}}
        onClose={()=>{}}
        onHelp={()=>{}}
        onEdit={()=>{}}
        onDataChange={()=>{}}
        confirmOnCloseReset={false}
        hasSQL={true}
        getSQLValue={()=>'select 1;'}
        disableSqlHelp={false}
      />);
    });

    it('init', ()=>{
      /* Add a row */
      ctrl.find('DataGridView').find('PgIconButton[data-test="add-row"]').find('button').simulate('click');
      setTimeout(()=>{
        ctrl.update();
      }, 0);
    });
  });

  describe('SchemaPropertiesView', ()=>{
    let onEdit = jasmine.createSpy('onEdit'),
      onHelp = jasmine.createSpy('onHelp'),
      ctrl = null;

    beforeEach(()=>{
      ctrl = mount(<SchemaView
        formType='tab'
        schema={getSchema()}
        getInitData={getInitData}
        viewHelperProps={{
          mode: 'properties',
        }}
        onHelp={onHelp}
        disableSqlHelp={false}
        onEdit={onEdit}
      />);
    });

    it('init', (done)=>{
      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find('MappedFormControl').length).toBe(6);
        expect(ctrl.find('ForwardRef(Accordion)').length).toBe(2);
        done();
      }, 0);
    });

    it('onHelp', (done)=>{
      ctrl.find('PgIconButton[data-test="help"]').find('button').simulate('click');
      setTimeout(()=>{
        ctrl.update();
        expect(onHelp).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('onEdit', (done)=>{
      ctrl.find('PgIconButton[data-test="edit"]').find('button').simulate('click');
      setTimeout(()=>{
        ctrl.update();
        expect(onEdit).toHaveBeenCalled();
        done();
      }, 0);
    });
  });
});
