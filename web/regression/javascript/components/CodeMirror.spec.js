/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import { withTheme } from '../fake_theme';

import pgWindow from 'sources/window';
import CodeMirror from 'sources/components/ReactCodeMirror';
import FindDialog from 'sources/components/ReactCodeMirror/components/FindDialog';
import CustomEditorView from 'sources/components/ReactCodeMirror/CustomEditorView';
import fakePgAdmin from '../fake_pgadmin';
import { render, screen, fireEvent } from '@testing-library/react';
import * as CMSearch from '@codemirror/search';

jest.mock('sources/components/ReactCodeMirror/CustomEditorView');
jest.mock('@codemirror/search', () => ({
  ...(jest.requireActual('@codemirror/search')),
  SearchQuery: jest.fn().mockImplementation(() => {
    return {
      eq: jest.fn(),
    };
  }),
  openSearchPanel: jest.fn(),
  closeSearchPanel: jest.fn(),
  replaceNext: jest.fn(),
}));

describe('CodeMirror', ()=>{
  const ThemedCM = withTheme(CodeMirror);
  let cmInstance, editor;

  const cmRerender = (props)=>{
    cmInstance.rerender(
      <ThemedCM
        value={'Init text'}
        className="testClass"
        currEditor={(obj) => {
          editor = obj;
        }}
        {...props}
      />
    );
  };
  beforeEach(()=>{
    pgWindow.pgAdmin = fakePgAdmin;
    cmInstance = render(
      <ThemedCM
        value={'Init text'}
        className="testClass"
        currEditor={(obj) => {
          editor = obj;
        }}
      />);
  });

  afterEach(()=>{
    pgWindow.pgAdmin = undefined;
  });

  it('init', async ()=>{
    expect(CustomEditorView).toHaveBeenCalledTimes(1);
    expect(editor.setValue).toHaveBeenCalledWith('Init text');
  });

  it('change value', ()=>{
    editor.state = {
      doc: [],
    };
    editor.setValue.mockClear();
    jest.spyOn(editor, 'getValue').mockReturnValue('Init text');
    cmRerender({value: 'the new text'});
    expect(editor.setValue).toHaveBeenCalledWith('the new text');

    editor.setValue.mockClear();
    jest.spyOn(editor, 'getValue').mockReturnValue('the new text');
    cmRerender({value: null});
    expect(editor.setValue).toHaveBeenCalledWith('');
  });


  describe('FindDialog', ()=>{
    let ctrl;
    const onClose = jest.fn();
    const ThemedFindDialog = withTheme(FindDialog);
    const ctrlMount = (props)=>{
      ctrl = render(
        <ThemedFindDialog
          editor={editor}
          show={true}
          onClose={onClose}
          {...props}
        />
      );
    };

    it('init', ()=>{
      ctrlMount({});

      CMSearch.SearchQuery.mockClear();
      const input = ctrl.container.querySelector('input');

      fireEvent.change(input, {
        target: {value: '\n\r\tA'},
      });

      expect(CMSearch.SearchQuery).toHaveBeenCalledWith(expect.objectContaining({
        search: expect.stringContaining('A')
      }));
    });

    it('escape', ()=>{
      ctrlMount({});
      CMSearch.closeSearchPanel.mockClear();

      fireEvent.keyDown(ctrl.container.querySelector('input'), {
        key: 'Escape',
      });

      expect(CMSearch.closeSearchPanel).toHaveBeenCalled();
    });

    it('toggle match case', ()=>{
      ctrlMount({});
      const btn = screen.getAllByRole('button').at(0);
      expect(btn.className.includes('Buttons-defaultButton')).toBe(true);
      fireEvent.click(btn);

      expect(screen.getAllByRole('button').at(0).className.includes('Buttons-primaryButton')).toBe(true);
    });

    it('toggle regex', ()=>{
      ctrlMount({});

      fireEvent.change(ctrl.container.querySelector('input'), {
        target: {value: 'A'},
      });

      const btn = screen.getAllByRole('button').at(1);
      expect(btn.className.includes('Buttons-defaultButton')).toBe(true);
      fireEvent.click(btn);
    });

    it('replace', async ()=>{
      ctrlMount({replace: true});
      CMSearch.SearchQuery.mockClear();

      fireEvent.change(ctrl.container.querySelectorAll('input')[0], {
        target: {value: 'A'},
      });
      fireEvent.change(ctrl.container.querySelectorAll('input')[1], {
        target: {value: 'B'},
      });
      fireEvent.keyPress(ctrl.container.querySelectorAll('input')[1], {
        key: 'Enter', shiftKey: true, code: 13, charCode: 13
      });

      expect(CMSearch.SearchQuery).toHaveBeenCalledWith(expect.objectContaining({
        search: 'A',
        replace: 'B'
      }));

      expect(CMSearch.replaceNext).toHaveBeenCalled();
    });
  });
});
