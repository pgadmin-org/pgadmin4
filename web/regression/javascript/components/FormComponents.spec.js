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
import { withTheme } from '../fake_theme';
import { createMount } from '@material-ui/core/test-utils';
import { OutlinedInput, FormHelperText, IconButton, FormControlLabel,
  Switch, Checkbox, Button, InputLabel } from '@material-ui/core';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import InfoRoundedIcon from '@material-ui/icons/InfoRounded';
import CloseIcon from '@material-ui/icons/CloseRounded';
import ErrorRoundedIcon from '@material-ui/icons/ErrorOutlineRounded';
import WarningRoundedIcon from '@material-ui/icons/WarningRounded';


import {FormInputText, FormInputFileSelect, FormInputSQL,
  FormInputSwitch, FormInputCheckbox, FormInputToggle, FormInputSelect,
  FormInputColor,
  FormFooterMessage,
  MESSAGE_TYPE} from '../../../pgadmin/static/js/components/FormComponents';
import CodeMirror from '../../../pgadmin/static/js/components/CodeMirror';
import { ToggleButton } from '@material-ui/lab';
import { DefaultButton, PrimaryButton } from '../../../pgadmin/static/js/components/Buttons';
import * as showFileManager from '../../../pgadmin/static/js/helpers/showFileManager';

/* MUI Components need to be wrapped in Theme for theme vars */
describe('FormComponents', ()=>{
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

  let onAccessibility = (ctrl)=> {
    expect(ctrl.find(InputLabel)).toHaveProp('htmlFor', 'inpCid');
    expect(ctrl.find(FormHelperText)).toHaveProp('id', 'hinpCid');
    let inputProps = ctrl.find(OutlinedInput).prop('inputProps');
    expect(inputProps).toEqual(jasmine.objectContaining({
      id: 'inpCid',
      'aria-describedby': 'hinpCid',
    }));
  };

  describe('FormInputText', ()=>{
    let ThemedFormInputText = withTheme(FormInputText), ctrl;

    beforeEach(()=>{
      ctrl = mount(
        <ThemedFormInputText
          label="First"
          className="someClass"
          testcid="inpCid"
          helpMessage="some help message"
          /* InputText */
          readonly={false}
          disabled={false}

          value={'thevalue'}
          controlProps={{
            extraprop: 'test',
            maxLength: 50,
          }}
        />);
    });

    it('init', ()=>{
      expect(ctrl.find(InputLabel).text()).toBe('First');
      expect(ctrl.find(OutlinedInput).prop('extraprop')).toEqual('test');
      expect( ctrl.find(OutlinedInput).prop('inputProps')).toEqual(jasmine.objectContaining({
        maxLength: 50,
      }));
      expect(ctrl.find(OutlinedInput).prop('readOnly')).toBe(false);
      expect(ctrl.find(OutlinedInput).prop('disabled')).toBe(false);
      expect(ctrl.find(OutlinedInput).prop('value')).toBe('thevalue');
      expect(ctrl.find(FormHelperText).text()).toBe('some help message');
    });

    it('props change', ()=>{
      let onChange = ()=>{/*This is intentional (SonarQube)*/};
      ctrl.setProps({
        readonly: true,
        disabled: true,
        value: 'new value',
        onChange: onChange,
      });

      expect(ctrl.find(OutlinedInput).prop('readOnly')).toBe(true);
      expect(ctrl.find(OutlinedInput).prop('disabled')).toBe(true);
      expect(ctrl.find(OutlinedInput).prop('value')).toBe('new value');
    });

    it('accessibility', ()=>{
      onAccessibility(ctrl);
    });
  });

  describe('FormInputFileSelect', ()=>{
    let ThemedFormInputFileSelect = withTheme(FormInputFileSelect), ctrl;

    beforeEach(()=>{
      spyOn(showFileManager, 'showFileManager').and.callFake((controlProps, onFileSelect)=>{
        onFileSelect('selected/file');
      });
      ctrl = mount(
        <ThemedFormInputFileSelect
          label="First"
          className="someClass"
          testcid="inpCid"
          helpMessage="some help message"
          /* InputText */
          readonly={false}
          disabled={false}
          value={'thevalue'}
          controlProps={{
            dialogType: 'select_file', supportedTypes: ['*'],
          }}
        />);
    });

    it('init', ()=>{
      expect(ctrl.find(InputLabel).text()).toBe('First');
      expect(ctrl.find(OutlinedInput).prop('readOnly')).toBe(false);
      expect(ctrl.find(OutlinedInput).prop('disabled')).toBe(false);
      expect(ctrl.find(OutlinedInput).prop('value')).toBe('thevalue');
      expect(ctrl.find(FormHelperText).text()).toBe('some help message');
    });

    it('props change', ()=>{
      ctrl.setProps({
        readonly: true,
        disabled: true,
        value: 'new value',
      });

      expect(ctrl.find(OutlinedInput).prop('readOnly')).toBe(true);
      expect(ctrl.find(OutlinedInput).prop('disabled')).toBe(true);
      expect(ctrl.find(OutlinedInput).prop('value')).toBe('new value');
      expect(ctrl.find(IconButton).prop('disabled')).toBe(true);
    });


    it('file select', (done)=>{
      let onChange = jasmine.createSpy();
      ctrl.setProps({
        onChange: onChange,
      });
      ctrl.find(IconButton).simulate('click');
      setTimeout(()=>{
        expect(onChange).toHaveBeenCalledWith('selected/file');
        done();
      }, 0);
    });

    it('accessibility', ()=>{
      onAccessibility(ctrl);
    });
  });

  describe('FormInputSQL', ()=>{
    let ThemedFormInputSQL = withTheme(FormInputSQL), ctrl;

    beforeEach(()=>{
      ctrl = mount(
        <ThemedFormInputSQL
          label="First"
          className="someClass"
          testcid="inpCid"
          helpMessage="some help message"
          /* InputSQL */
          value={'thevalue'}
          controlProps={{
            op1: 'test'
          }}
        />);
    });

    it('init', ()=>{
      expect(ctrl.find(InputLabel).text()).toBe('First');
      expect(ctrl.find(CodeMirror).prop('value')).toEqual('thevalue');
      expect(ctrl.find(CodeMirror).prop('options')).toEqual(jasmine.objectContaining({'op1': 'test'}));
      expect(ctrl.find(FormHelperText).text()).toBe('some help message');
    });
  });

  describe('FormInputSwitch', ()=>{
    let ThemedFormInputSwitch = withTheme(FormInputSwitch), ctrl, onChange=()=>{return 1;};

    beforeEach(()=>{
      ctrl = mount(
        <ThemedFormInputSwitch
          label="First"
          className="someClass"
          testcid="inpCid"
          helpMessage="some help message"
          /* InputSwitch */
          readonly={false}
          value={false}
          onChange={onChange}
        />);
    });

    it('init', ()=>{
      expect(ctrl.find(InputLabel).text()).toBe('First');
      expect(ctrl.find(Switch).prop('checked')).toBe(false);
      expect(ctrl.find(Switch).prop('onChange')).toBe(onChange);
      expect(ctrl.find(FormHelperText).text()).toBe('some help message');
    });

    it('props change', ()=>{
      ctrl.setProps({
        readonly: true,
        value: true,
      });

      expect(ctrl.find(Switch).prop('checked')).toBe(true);
      expect(ctrl.find(Switch).prop('onChange')).not.toBe(onChange);
    });

    it('accessibility', ()=>{
      expect(ctrl.find(InputLabel)).toHaveProp('htmlFor', 'inpCid');
      expect(ctrl.find(FormHelperText)).toHaveProp('id', 'hinpCid');
      expect(ctrl.find(Switch).prop('id')).toBe('inpCid');
      let inputProps = ctrl.find(Switch).prop('inputProps');
      expect(inputProps).toEqual(jasmine.objectContaining({
        'aria-describedby': 'hinpCid',
      }));
    });
  });

  describe('FormInputCheckbox', ()=>{
    let ThemedFormInputCheckbox = withTheme(FormInputCheckbox), ctrl, onChange=()=>{return 1;};

    beforeEach(()=>{
      ctrl = mount(
        <ThemedFormInputCheckbox
          label="First"
          className="someClass"
          testcid="inpCid"
          helpMessage="some help message"
          /* InputCheckbox */
          disabled={false}
          value={false}
          onChange={onChange}
          controlProps={{
            label: 'Second'
          }}
        />);
    });

    it('init', ()=>{
      expect(ctrl.find(InputLabel).text()).toBe('First');
      expect(ctrl.find(FormControlLabel).prop('label')).toBe('Second');
      expect(ctrl.find(Checkbox).prop('checked')).toBe(false);
      expect(ctrl.find(Checkbox).prop('onChange')).toBe(onChange);
      expect(ctrl.find(FormHelperText).text()).toBe('some help message');
    });

    it('props change', ()=>{
      ctrl.setProps({
        readonly: true,
        value: true,
      });

      expect(ctrl.find(Checkbox).prop('checked')).toBe(true);
      expect(ctrl.find(Checkbox).prop('onChange')).not.toBe(onChange);
    });

    it('accessibility', ()=>{
      expect(ctrl.find(InputLabel)).toHaveProp('htmlFor', 'inpCid');
      expect(ctrl.find(FormHelperText)).toHaveProp('id', 'hinpCid');
      expect(ctrl.find(Checkbox).prop('id')).toBe('inpCid');
      let inputProps = ctrl.find(Checkbox).prop('inputProps');
      expect(inputProps).toEqual(jasmine.objectContaining({
        'aria-describedby': 'hinpCid',
      }));
    });
  });

  describe('FormInputToggle', ()=>{
    let ThemedFormInputToggle = withTheme(FormInputToggle), ctrl, onChange=()=>{return 1;};

    beforeEach(()=>{
      ctrl = mount(
        <ThemedFormInputToggle
          label="First"
          className="someClass"
          testcid="inpCid"
          helpMessage="some help message"
          /* InputToggle */
          disabled={false}
          options={[
            {label: 'Op1', value: 1},
            {label: 'Op2', value: 2},
            {label: 'Op3', value: 3},
          ]}
          value={2}
          onChange={onChange}
        />);
    });

    it('init', ()=>{
      expect(ctrl.find(InputLabel).text()).toBe('First');
      expect(ctrl.find(ToggleButton).length).toBe(3);
      expect(ctrl.find(PrimaryButton).length).toBe(1);
      expect(ctrl.find(DefaultButton).length).toBe(2);
      expect(ctrl.find(ToggleButton).at(1).prop('component')).toBe(PrimaryButton);
      expect(ctrl.find(FormHelperText).text()).toBe('some help message');
    });

    it('props change', ()=>{
      ctrl.setProps({
        value: 1,
      });
      expect(ctrl.find(ToggleButton).at(0).prop('component')).toBe(PrimaryButton);
      expect(ctrl.find(ToggleButton).at(0)
        .find(CheckRoundedIcon)
        .prop('style')).toEqual(jasmine.objectContaining({
        visibility: 'visible'
      }));
    });

    it('accessibility', ()=>{
      expect(ctrl.find(InputLabel)).toHaveProp('htmlFor', 'inpCid');
      expect(ctrl.find(FormHelperText)).toHaveProp('id', 'hinpCid');
    });
  });

  describe('FormInputSelect', ()=>{
    let ThemedFormInputSelect = withTheme(FormInputSelect), ctrl, onChange=jasmine.createSpy('onChange'),
      ctrlMount = (props)=>{
        ctrl?.unmount();
        ctrl = mount(
          <ThemedFormInputSelect
            label="First"
            className="someClass"
            testcid="inpCid"
            helpMessage="some help message"
            /* InputSelect */
            readonly={false}
            disabled={false}
            options={[
              {label: 'Op1', value: 1},
              {label: 'Op2', value: 2},
              {label: 'Op3', value: 3},
            ]}
            value={1}
            onChange={onChange}
            {...props}
          />);
      };

    beforeEach(()=>{
      ctrlMount();
    });

    it('init', (done)=>{
      expect(ctrl.find(Select).exists()).toBe(true);
      expect(ctrl.find(CreatableSelect).exists()).toBe(false);
      expect(ctrl.find(FormHelperText).text()).toBe('some help message');

      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find(Select).props()).toEqual(jasmine.objectContaining({
          isMulti: false,
          value: {label: 'Op1', value: 1},
          inputId: 'inpCid',
          isSearchable: true,
          isClearable: true,
          isDisabled: false,
        }));
        done();
      }, 0);
    });

    it('readonly disabled', (done)=>{
      ctrl.setProps({
        readonly: true,
        disabled: true,
      });

      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find(Select).props()).toEqual(jasmine.objectContaining({
          isSearchable: false,
          isClearable: false,
          isDisabled: true,
          openMenuOnClick: false,
        }));
        done();
      }, 0);
    });

    it('no-clear with multi', (done)=>{
      ctrl.setProps({
        controlProps: {
          allowClear: false,
          multiple: true,
        },
        value: [2, 3],
      });

      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find(Select).props()).toEqual(jasmine.objectContaining({
          isMulti: true,
          isClearable: false,
          value: [{label: 'Op2', value: 2}, {label: 'Op3', value: 3}]
        }));
        done();
      }, 0);
    });

    it('creatable with multi', (done)=>{
      ctrl.setProps({
        controlProps: {
          creatable: true,
          multiple: true,
        },
        value: ['val1', 'val2'],
      });

      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find(Select).exists()).toBe(false);
        expect(ctrl.find(CreatableSelect).exists()).toBe(true);

        expect(ctrl.find(CreatableSelect).props()).toEqual(jasmine.objectContaining({
          isMulti: true,
          value: [{label: 'val1', value: 'val1'}, {label: 'val2', value: 'val2'}]
        }));
        done();
      }, 0);
    });

    it('promise options', (done)=>{
      let optionsLoaded = jasmine.createSpy();
      let res = [
        {label: 'PrOp1', value: 1},
        {label: 'PrOp2', value: 2},
        {label: 'PrOp3', value: 3},
      ];
      /* For options change, remount needed */
      ctrlMount({
        options: ()=>Promise.resolve(res),
        value: 3,
        optionsLoaded: optionsLoaded,
      });

      setTimeout(()=>{
        ctrl.update();
        expect(optionsLoaded).toHaveBeenCalledWith(res, 3);
        expect(ctrl.find(Select).props()).toEqual(jasmine.objectContaining({
          value: {label: 'PrOp3', value: 3},
        }));
        done();
      }, 0);
    });

    it('accessibility', ()=>{
      expect(ctrl.find(InputLabel)).toHaveProp('htmlFor', 'inpCid');
      expect(ctrl.find(FormHelperText)).toHaveProp('id', 'hinpCid');
    });
  });

  describe('FormInputColor', ()=>{
    let pickrObj = React.createRef();
    let ThemedFormInputColor = withTheme(FormInputColor), ctrl, onChange=jasmine.createSpy('onChange');

    beforeEach(()=>{
      ctrl = mount(
        <ThemedFormInputColor
          label="First"
          className="someClass"
          testcid="inpCid"
          helpMessage="some help message"
          /* InputColor */
          disabled={false}
          value="#f0f"
          onChange={onChange}
          currObj={(obj)=>pickrObj.current=obj}
        />);
    });

    afterEach(()=>{
      ctrl.unmount();
    });

    it('init', (done)=>{
      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find(Button).prop('style')).toEqual(jasmine.objectContaining({
          backgroundColor: '#f0f',
        }));
        done();
      }, 0);
    });

    it('no color', (done)=>{
      ctrl.setProps({
        value: null,
      });
      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find(Button).prop('style')).toEqual(jasmine.objectContaining({
          backgroundColor: null,
        }));
        expect(ctrl.find(Button).find(CloseIcon).exists()).toBe(true);
        done();
      }, 0);
    });

    it('other events', (done)=>{
      pickrObj.current.applyColor(false);
      setTimeout(()=>{
        expect(onChange).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('accessibility', ()=>{
      expect(ctrl.find(InputLabel)).toHaveProp('htmlFor', 'inpCid');
      expect(ctrl.find(FormHelperText)).toHaveProp('id', 'hinpCid');
    });
  });

  describe('FormFooterMessage', ()=>{
    let ThemedFormFooterMessage = withTheme(FormFooterMessage), ctrl, onClose=jasmine.createSpy('onClose');

    beforeEach(()=>{
      ctrl = mount(
        <ThemedFormFooterMessage
          type={MESSAGE_TYPE.SUCCESS}
          message="Some message"
          closable={false}
          onClose={onClose}
        />);
    });

    it('init', ()=>{
      expect(ctrl.find(CheckRoundedIcon).exists()).toBeTrue();
      expect(ctrl.text()).toBe('Some message');
    });

    it('change types', ()=>{
      ctrl.setProps({
        type: MESSAGE_TYPE.ERROR,
      });
      expect(ctrl.find(ErrorRoundedIcon).exists()).toBeTrue();

      ctrl.setProps({
        type: MESSAGE_TYPE.INFO,
      });
      expect(ctrl.find(InfoRoundedIcon).exists()).toBeTrue();

      ctrl.setProps({
        type: MESSAGE_TYPE.WARNING,
      });
      expect(ctrl.find(WarningRoundedIcon).exists()).toBeTrue();
    });

    it('closable', ()=>{
      ctrl.setProps({
        closable: true,
      });
      expect(ctrl.find(CloseIcon).exists()).toBeTrue();
      ctrl.find(IconButton).simulate('click');
      expect(onClose).toHaveBeenCalled();
    });

    it('no message', ()=>{
      ctrl.setProps({
        message: '',
      });
      expect(ctrl.isEmptyRender()).toBeTrue();
    });
  });
});
