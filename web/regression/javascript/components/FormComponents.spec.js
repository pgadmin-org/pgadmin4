/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import { withTheme } from '../fake_theme';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';


import {FormInput, FormInputText, FormInputFileSelect, FormInputSQL,
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

  describe('XSS sanitization', ()=>{
    let ThemedFormFooterMessage = withTheme(FormFooterMessage);
    let ThemedFormInput = withTheme(FormInput);

    it('NotifierMessage strips iframe srcdoc payload', ()=>{
      const xss = '<iframe srcdoc="&lt;script&gt;window.__xss=true&lt;/script&gt;">';
      const ctrl = render(
        <ThemedFormFooterMessage
          type={MESSAGE_TYPE.ERROR}
          message={'Failed to connect:\n' + xss}
          closable={false}
        />);
      expect(ctrl.container.querySelector('iframe')).toBeNull();
      expect(ctrl.container.querySelector('script')).toBeNull();
    });

    it('FormInput strips script tag in errorMessage', ()=>{
      const xss = '<script>window.__xss=true</script>Bad input';
      const ctrl = render(
        <ThemedFormInput label="Field" errorMessage={xss}>
          <input />
        </ThemedFormInput>);
      expect(ctrl.container.querySelector('script')).toBeNull();
    });

    it('preserves safe HTML formatting', ()=>{
      const ctrl = render(
        <ThemedFormFooterMessage
          type={MESSAGE_TYPE.INFO}
          message={'Connected to <b>prod</b><br/>OK'}
          closable={false}
        />);
      expect(ctrl.container.querySelector('b')).not.toBeNull();
      expect(ctrl.container.querySelector('br')).not.toBeNull();
    });

    it('NotifierMessage in plainText mode renders raw text, no HTML parsing', ()=>{
      const ctrl = render(
        <ThemedFormFooterMessage
          type={MESSAGE_TYPE.ERROR}
          message={'oops: <b>bold</b><br/>line two'}
          plainText={true}
          closable={false}
        />);
      // Even <b> and <br> tags must NOT be interpreted as DOM.
      expect(ctrl.container.querySelector('b')).toBeNull();
      expect(ctrl.container.querySelector('br')).toBeNull();
      // The raw characters appear in the text content instead.
      expect(ctrl.container.textContent)
        .toContain('oops: <b>bold</b><br/>line two');
    });

    it('NotifierMessage in plainText mode strips iframe payload', ()=>{
      const xss = '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;">';
      const ctrl = render(
        <ThemedFormFooterMessage
          type={MESSAGE_TYPE.ERROR}
          message={'Failed to connect:\n' + xss}
          plainText={true}
          closable={false}
        />);
      expect(ctrl.container.querySelector('iframe')).toBeNull();
      expect(ctrl.container.querySelector('script')).toBeNull();
    });

    it('FormInput errorMessage is rendered as plain text', ()=>{
      // The errorMessage prop is always treated as a validation / driver
      // error string. Even safe-looking HTML must render literally.
      const ctrl = render(
        <ThemedFormInput label="Field" errorMessage={'bad: <b>field</b>'}>
          <input />
        </ThemedFormInput>);
      expect(ctrl.container.querySelector('b')).toBeNull();
      expect(ctrl.container.textContent).toContain('bad: <b>field</b>');
    });

    // Exercise common XSS vectors beyond the iframe srcdoc payload cited
    // in the original report. DOMPurify's default config (used by the
    // HTML-mode NotifierMessage / AlertContent renderers) should
    // neutralise all of them — these tests pin that behavior so a
    // future config tweak (ADD_TAGS, FORBID_* relaxation, etc.) can't
    // silently re-open the class of bug.
    const VECTORS = [
      ['svg onload', '<svg/onload=alert(1)>'],
      ['img onerror', '<img src=x onerror=alert(1)>'],
      ['body onload', '<body onload=alert(1)>'],
      ['math href javascript',
        '<math href="javascript:alert(1)"><mtext>x</mtext></math>'],
      ['anchor javascript URI',
        '<a href="javascript:alert(1)">click</a>'],
      ['form action javascript',
        '<form action="javascript:alert(1)"><input></form>'],
      ['object data javascript',
        '<object data="javascript:alert(1)"></object>'],
      ['embed src javascript', '<embed src="javascript:alert(1)">'],
      ['style expression',
        '<div style="background:url(javascript:alert(1))">x</div>'],
      ['data URI in iframe src',
        '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>'],
      ['marquee onstart', '<marquee onstart=alert(1)>x</marquee>'],
      ['details ontoggle', '<details ontoggle=alert(1) open>x</details>'],
      ['template script',
        '<template><script>alert(1)</script></template>'],
      ['xss in noscript',
        '<noscript><script>alert(1)</script></noscript>'],
    ];

    for (const [name, payload] of VECTORS) {
      it(`NotifierMessage neutralises XSS vector: ${name}`, ()=>{
        window.__xss = undefined;
        const ctrl = render(
          <ThemedFormFooterMessage
            type={MESSAGE_TYPE.ERROR}
            message={payload}
            closable={false}
          />);
        // No script element should reach the DOM.
        expect(ctrl.container.querySelector('script')).toBeNull();
        // No iframe or embed escape.
        expect(ctrl.container.querySelector('iframe')).toBeNull();
        expect(ctrl.container.querySelector('embed')).toBeNull();
        // Inline event handlers stripped — verify nothing fires by
        // re-checking the global sentinel.
        expect(window.__xss).toBeUndefined();
        // No element should keep a javascript: / data: URL in
        // href / src / action.
        ctrl.container.querySelectorAll('[href], [src], [action]')
          .forEach((el) => {
            for (const attr of ['href', 'src', 'action']) {
              const v = el.getAttribute(attr);
              if (v) {
                expect(v.toLowerCase()).not.toMatch(/^\s*javascript:/);
                expect(v.toLowerCase()).not.toMatch(/^\s*data:/);
              }
            }
          });
        // No on* event-handler attributes survive.
        ctrl.container.querySelectorAll('*').forEach((el) => {
          for (const attr of el.attributes) {
            expect(attr.name.toLowerCase()).not.toMatch(/^on/);
          }
        });
      });
    }
  });
});
