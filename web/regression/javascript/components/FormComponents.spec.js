/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import { withTheme } from '../fake_theme';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';


import {FormInputText, FormInputFileSelect, FormInputSQL,
  FormInputSwitch, FormInputCheckbox, FormInputToggle, FormInputSelect,
  FormInputColor,
  FormFooterMessage,
  MESSAGE_TYPE} from '../../../pgadmin/static/js/components/FormComponents';
import * as showFileManager from '../../../pgadmin/static/js/helpers/showFileManager';

/* MUI Components need to be wrapped in Theme for theme vars */
describe('FormComponents', ()=>{
  let onAccessibility = ()=> {
    const input = screen.getByTestId('input-text');
    expect(input.getAttribute('id')).toBe('inpCid');
    expect(input.getAttribute('aria-describedby')).toBe('hinpCid');
  };

  describe('FormInputText', ()=>{
    let ThemedFormInputText = withTheme(FormInputText), ctrl;
    const ctrlRerender = (props)=>{
      ctrl.rerender(
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
          {...props}
        />);
    };

    beforeEach(()=>{
      ctrl = render(
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
      expect(screen.getByLabelText('First')).toBeInTheDocument();
      const input = screen.getByDisplayValue('thevalue');
      expect(input).toBeInTheDocument();
      expect(input.hasAttribute('readonly')).toBe(false);
      expect(input.hasAttribute('disabled')).toBe(false);
      expect(screen.getByText('some help message')).toBeInTheDocument();
    });

    it('props change', ()=>{
      let onChange = ()=>{/*This is intentional (SonarQube)*/};
      ctrlRerender({
        readonly: true,
        disabled: true,
        value: 'new value',
        onChange: onChange,
      });
      const input = screen.getByDisplayValue('new value');
      expect(input).toBeInTheDocument();
      expect(input.hasAttribute('readonly')).toBe(true);
      expect(input.hasAttribute('disabled')).toBe(true);
    });

    it('accessibility', ()=>{
      onAccessibility();
    });
  });

  describe('FormInputFileSelect', ()=>{
    let ThemedFormInputFileSelect = withTheme(FormInputFileSelect), ctrl;
    const ctrlRerender = (props)=>{
      ctrl.rerender(
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
          {...props}
        />);
    };

    beforeEach(()=>{
      jest.spyOn(showFileManager, 'showFileManager').mockImplementation((controlProps, onFileSelect)=>{
        onFileSelect('selected/file');
      });
      ctrl = render(
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
      expect(screen.getByLabelText('First')).toBeInTheDocument();
      const input = screen.getByDisplayValue('thevalue');
      expect(input).toBeInTheDocument();
      expect(input.hasAttribute('readonly')).toBe(false);
      expect(input.hasAttribute('disabled')).toBe(false);
      expect(screen.getByText('some help message')).toBeInTheDocument();
    });

    it('props change', ()=>{
      ctrlRerender({
        readonly: true,
        disabled: true,
        value: 'new value',
      });

      const input = screen.getByDisplayValue('new value');
      expect(input).toBeInTheDocument();
      expect(input.hasAttribute('readonly')).toBe(true);
      expect(input.hasAttribute('disabled')).toBe(true);
    });


    it('file select', ()=>{
      let onChange = jest.fn();
      ctrlRerender({
        onChange: onChange,
      });
      fireEvent.click(screen.getByRole('button'));
      expect(onChange).toHaveBeenCalledWith('selected/file');
    });

    it('accessibility', ()=>{
      onAccessibility();
    });
  });

  describe('FormInputSQL', ()=>{
    let ThemedFormInputSQL = withTheme(FormInputSQL);

    beforeEach(()=>{
      render(
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
      expect(screen.getByLabelText('First')).toBeInTheDocument();
      expect(screen.getByText('thevalue')).toBeInTheDocument();
      expect(screen.getByText('some help message')).toBeInTheDocument();
    });
  });

  describe('FormInputSwitch', ()=>{
    let ThemedFormInputSwitch = withTheme(FormInputSwitch), ctrl, onChange=()=>{return 1;};
    const ctrlRerender = (props)=>{
      ctrl.rerender(
        <ThemedFormInputSwitch
          label="First"
          className="someClass"
          testcid="inpCid"
          helpMessage="some help message"
          /* InputSwitch */
          readonly={false}
          value={false}
          onChange={onChange}
          {...props}
        />);
    };

    beforeEach(()=>{
      ctrl = render(
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
      expect(screen.getByLabelText('First')).toBeInTheDocument();
      const input = ctrl.container.querySelector('.MuiSwitch-switchBase');
      expect(input).toBeInTheDocument();
      expect(input.className.includes('Mui-checked')).toBe(false);
      expect(screen.getByText('some help message')).toBeInTheDocument();
    });

    it('props change', ()=>{
      ctrlRerender({
        readonly: true,
        value: true,
      });

      const input = ctrl.container.querySelector('.MuiSwitch-switchBase');
      expect(input.className.includes('Mui-checked')).toBe(true);
    });

    it('accessibility', ()=>{
      const input = ctrl.container.querySelector('input');
      expect(input.getAttribute('id')).toBe('inpCid');
      expect(input.getAttribute('aria-describedby')).toBe('hinpCid');
    });
  });

  describe('FormInputCheckbox', ()=>{
    let ThemedFormInputCheckbox = withTheme(FormInputCheckbox), ctrl, onChange=()=>{return 1;};
    const ctrlRerender = (props)=>{
      ctrl.rerender(
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
          {...props}
        />);
    };

    beforeEach(()=>{
      ctrl = render(
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
      expect(screen.getByLabelText('First')).toBeInTheDocument();
      expect(screen.getByLabelText('Second')).toBeInTheDocument();

      const input = ctrl.container.querySelector('.MuiCheckbox-root');
      expect(input).toBeInTheDocument();
      expect(input.className.includes('Mui-checked')).toBe(false);
      expect(screen.getByText('some help message')).toBeInTheDocument();
    });

    it('props change', ()=>{
      ctrlRerender({
        readonly: true,
        value: true,
      });
      const input = ctrl.container.querySelector('.MuiCheckbox-root');
      expect(input).toBeInTheDocument();
      expect(input.className.includes('Mui-checked')).toBe(true);
    });

    it('accessibility', ()=>{
      const input = ctrl.container.querySelector('input');
      expect(input.getAttribute('id')).toBe('inpCid');
      expect(input.getAttribute('aria-describedby')).toBe('hinpCid');
    });
  });

  describe('FormInputToggle', ()=>{
    let ThemedFormInputToggle = withTheme(FormInputToggle), ctrl, onChange=()=>{return 1;};
    const ctrlRerender = (props)=>{
      ctrl.rerender(
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
          {...props}
        />);
    };

    beforeEach(()=>{
      ctrl = render(
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
      expect(screen.getByLabelText('First')).toBeInTheDocument();
      expect(screen.getAllByRole('button').length).toBe(3);
      expect(screen.getAllByRole('button').at(0).className.includes('primaryButton')).toBe(false);
      expect(screen.getAllByRole('button').at(1).className.includes('primaryButton')).toBe(true);
      expect(screen.getAllByRole('button').at(2).className.includes('primaryButton')).toBe(false);
      expect(screen.getByText('some help message')).toBeInTheDocument();
    });

    it('props change', ()=>{
      ctrlRerender({
        value: 1,
      });
      expect(screen.getAllByRole('button').at(0).className.includes('primaryButton')).toBe(true);
      expect(screen.getAllByRole('button').at(1).className.includes('primaryButton')).toBe(false);
      expect(screen.getAllByRole('button').at(2).className.includes('primaryButton')).toBe(false);
    });

    it('accessibility', ()=>{
      const input = ctrl.container.querySelector('input');
      expect(input.getAttribute('id')).toBe('inpCid');
      expect(input.getAttribute('aria-describedby')).toBe('hinpCid');
    });
  });

  describe('FormInputSelect', ()=>{
    let ThemedFormInputSelect = withTheme(FormInputSelect), ctrl, onChange=jest.fn();
    const ctrlRerender = (props)=>{
      act(()=>{
        ctrl.rerender(
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
      });
    };

    beforeEach(async ()=>{
      await act(async ()=>{
        ctrl = await render(
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
          />);
      });
    });

    it('init', ()=>{
      expect(screen.getByLabelText('First')).toBeInTheDocument();
      expect(screen.getByText('Op1')).toBeInTheDocument();
      expect(screen.getByText('some help message')).toBeInTheDocument();
    });

    it('no-clear with multi', ()=>{
      ctrlRerender({
        controlProps: {
          allowClear: false,
          multiple: true,
        },
        value: [2, 3],
      });
      expect(screen.getByText('Op2')).toBeInTheDocument();
      expect(screen.getByText('Op3')).toBeInTheDocument();
    });

    it('creatable with multi', ()=>{
      ctrlRerender({
        controlProps: {
          creatable: true,
          multiple: true,
        },
        value: ['val1', 'val2'],
      });

      expect(screen.getByText('val1')).toBeInTheDocument();
      expect(screen.getByText('val2')).toBeInTheDocument();
    });

    it('promise options', async ()=>{
      let optionsLoaded = jest.fn();
      let res = [
        {label: 'PrOp1', value: 1},
        {label: 'PrOp2', value: 2},
        {label: 'PrOp3', value: 3},
      ];
      /* For options change, remount needed */
      ctrlRerender({
        options: ()=>Promise.resolve(res),
        optionsReloadBasis: 3,
        value: 3,
        optionsLoaded: optionsLoaded,
      });
      // expect(screen.getByText('PrOp3')).toBeInTheDocument()

      await waitFor(()=>expect(screen.getByText('PrOp3')).toBeInTheDocument(), {timeout: 500});
    });

    it('accessibility', ()=>{
      const input = ctrl.container.querySelectorAll('input')[1];
      expect(input.getAttribute('id')).toBe('inpCid');
      expect(input.getAttribute('aria-describedby')).toBe('hinpCid');
    });
  });

  describe('FormInputColor', ()=>{
    let pickrObj = React.createRef();
    let ThemedFormInputColor = withTheme(FormInputColor), ctrl, onChange=jest.fn();
    const ctrlRerender = (props)=>{
      ctrl.rerender(
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
          {...props}
        />);
    };

    beforeEach(()=>{
      ctrl = render(
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

    it('init', ()=>{
      expect(screen.getAllByRole('button').at(0).style.backgroundColor).toEqual('rgb(255, 0, 255)');
    });

    it('no color', ()=>{
      ctrlRerender({
        value: null,
      });
      const btn = screen.getAllByRole('button').at(0);
      expect(btn.style.backgroundColor).toBe('');
    });
  });

  describe('FormFooterMessage', ()=>{
    let ThemedFormFooterMessage = withTheme(FormFooterMessage), ctrl, onClose=jest.fn();
    const ctrlRerender = (props)=>{
      ctrl.rerender(
        <ThemedFormFooterMessage
          type={MESSAGE_TYPE.SUCCESS}
          message="Some message"
          closable={false}
          onClose={onClose}
          {...props}
        />);
    };
    beforeEach(()=>{
      ctrl = render(
        <ThemedFormFooterMessage
          type={MESSAGE_TYPE.SUCCESS}
          message="Some message"
          closable={false}
          onClose={onClose}
        />);
    });

    it('init', ()=>{
      expect(screen.getByTestId(MESSAGE_TYPE.SUCCESS)).toBeInTheDocument();
      expect(screen.getByText('Some message')).toBeInTheDocument();
    });

    it('change types', ()=>{
      ctrlRerender({
        type: MESSAGE_TYPE.ERROR,
      });
      expect(screen.getByTestId(MESSAGE_TYPE.ERROR)).toBeInTheDocument();

      ctrlRerender({
        type: MESSAGE_TYPE.INFO,
      });
      expect(screen.getByTestId(MESSAGE_TYPE.INFO)).toBeInTheDocument();

      ctrlRerender({
        type: MESSAGE_TYPE.WARNING,
      });
      expect(screen.getByTestId(MESSAGE_TYPE.WARNING)).toBeInTheDocument();
    });

    it('closable', ()=>{
      ctrlRerender({
        closable: true,
      });
      const btn = screen.getByTestId('Close');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(onClose).toHaveBeenCalled();
    });

    it('no message', ()=>{
      ctrlRerender({
        message: '',
      });
      expect(ctrl.container).toBeEmptyDOMElement();
    });
  });
});
