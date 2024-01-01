/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import {default as OrigCodeMirror} from 'bundled_codemirror';
import { withTheme } from '../fake_theme';

import pgWindow from 'sources/window';
import CodeMirror from 'sources/components/CodeMirror';
import { FindDialog } from '../../../pgadmin/static/js/components/CodeMirror';
import fakePgAdmin from '../fake_pgadmin';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('CodeMirror', ()=>{
  const ThemedCM = withTheme(CodeMirror);
  let cmInstance, options={
      lineNumbers: true,
      mode: 'text/x-pgsql',
    },
    cmObj = OrigCodeMirror.fromTextArea();

  const cmRerender = (props)=>{
    cmInstance.rerender(
      <ThemedCM
        value={'Init text'}
        options={options}
        className="testClass"
        {...props}
      />
    );
  };
  beforeEach(()=>{
    pgWindow.pgAdmin = fakePgAdmin;
    // jest.spyOn(OrigCodeMirror, 'fromTextArea').mockReturnValue(cmObj);
    cmInstance = render(
      <ThemedCM
        value={'Init text'}
        options={options}
        className="testClass"
      />);
  });

  afterEach(()=>{
    pgWindow.pgAdmin = undefined;
  });

  it('init', async ()=>{
    /* textarea ref passed to fromTextArea */
    expect(OrigCodeMirror.fromTextArea).toHaveBeenCalledWith(cmInstance.container.querySelector('textarea'), expect.objectContaining(options));
    await waitFor(() => expect(cmObj.setValue).toHaveBeenCalledWith('Init text'));
  });

  it('change value', ()=>{
    cmRerender({value: 'the new text'});
    expect(cmObj.setValue).toHaveBeenCalledWith('the new text');

    cmRerender({value: null});
    expect(cmObj.setValue).toHaveBeenCalledWith('');
  });


  describe('FindDialog', ()=>{
    let ctrl;
    const onClose = jest.fn();
    const ThemedFindDialog = withTheme(FindDialog);
    const ctrlMount = (props)=>{
      ctrl = render(
        <ThemedFindDialog
          editor={cmObj}
          show={true}
          onClose={onClose}
          {...props}
        />
      );
    };

    it('init', ()=>{
      ctrlMount({});

      cmObj.removeOverlay.mockClear();
      cmObj.addOverlay.mockClear();
      const input = ctrl.container.querySelector('input');

      fireEvent.change(input, {
        target: {value: '\n\r\tA'},
      });

      expect(cmObj.removeOverlay).toHaveBeenCalled();
      expect(cmObj.addOverlay).toHaveBeenCalled();
      expect(cmObj.setSelection).toHaveBeenCalledWith(3, 14);
      expect(cmObj.scrollIntoView).toHaveBeenCalled();
    });

    it('escape', ()=>{
      ctrlMount({});
      cmObj.removeOverlay.mockClear();

      fireEvent.keyDown(ctrl.container.querySelector('input'), {
        key: 'Escape',
      });

      expect(cmObj.removeOverlay).toHaveBeenCalled();
    });

    it('toggle match case', ()=>{
      ctrlMount({});
      const btn = screen.getAllByRole('button').at(0);
      expect(btn.className.includes('makeStyles-defaultButton')).toBe(true);
      fireEvent.click(btn);

      expect(screen.getAllByRole('button').at(0).className.includes('makeStyles-primaryButton')).toBe(true);
    });

    it('toggle regex', ()=>{
      ctrlMount({});

      fireEvent.change(ctrl.container.querySelector('input'), {
        target: {value: 'A'},
      });

      const btn = screen.getAllByRole('button').at(1);
      expect(btn.className.includes('makeStyles-defaultButton')).toBe(true);
      fireEvent.click(btn);
    });

    it('replace', async ()=>{
      ctrlMount({replace: true});
      cmObj.getSearchCursor().replace.mockClear();
      fireEvent.change(ctrl.container.querySelectorAll('input')[0], {
        target: {value: 'A'},
      });
      fireEvent.change(ctrl.container.querySelectorAll('input')[1], {
        target: {value: 'B'},
      });
      fireEvent.keyPress(ctrl.container.querySelectorAll('input')[1], {
        key: 'Enter', shiftKey: true, code: 13, charCode: 13
      });
      await waitFor(()=>{
        expect(cmObj.getSearchCursor().replace).toHaveBeenCalled();
      });
    });
  });
});
