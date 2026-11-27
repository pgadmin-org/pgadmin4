/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import { withTheme } from '../fake_theme';

import pgWindow from 'sources/window';
import CodeMirror from 'sources/components/ReactCodeMirror';
import FindDialog, { findMatchKeyBinding } from 'sources/components/ReactCodeMirror/components/FindDialog';
import CustomEditorView from 'sources/components/ReactCodeMirror/CustomEditorView';
import fakePgAdmin from '../fake_pgadmin';
import { render, screen, fireEvent } from '@testing-library/react';
import * as CMSearch from '@codemirror/search';
import { EditorView, keymap, runScopeHandlers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { tabKeyBinding } from 'sources/components/ReactCodeMirror/components/Editor';

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
  findNext: jest.fn(),
  findPrevious: jest.fn(),
  searchPanelOpen: jest.fn(),
  getSearchQuery: jest.fn(),
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

    it.each([
      [false, 'findNext'],
      [true, 'findPrevious'],
    ])('F3 with shift %s calls %s', (shiftKey, fn)=>{
      ctrlMount({});
      CMSearch.findNext.mockClear();
      CMSearch.findPrevious.mockClear();

      fireEvent.keyDown(ctrl.container.querySelector('input'), {
        key: 'F3', shiftKey,
      });

      expect(CMSearch[fn]).toHaveBeenCalledWith(editor);
      expect(CMSearch[fn == 'findNext' ? 'findPrevious' : 'findNext']).not.toHaveBeenCalled();
    });

    it.each(['ctrlKey', 'altKey', 'metaKey'])('F3 with %s is left alone', (modifier)=>{
      ctrlMount({});
      CMSearch.findNext.mockClear();
      CMSearch.findPrevious.mockClear();

      fireEvent.keyDown(ctrl.container.querySelector('input'), {
        key: 'F3', [modifier]: true,
      });

      expect(CMSearch.findNext).not.toHaveBeenCalled();
      expect(CMSearch.findPrevious).not.toHaveBeenCalled();
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

  describe('findMatchKeyBinding', ()=>{
    const view = {state: {}};
    let openFind, binding;

    beforeEach(()=>{
      openFind = jest.fn();
      binding = findMatchKeyBinding(openFind);
      CMSearch.findNext.mockClear();
      CMSearch.findPrevious.mockClear();
    });

    it('is bound to F3 and Shift+F3', ()=>{
      expect(binding.key).toBe('F3');
      expect(binding.preventDefault).toBe(true);
    });

    it.each([
      ['run', 'findNext'],
      ['shift', 'findPrevious'],
    ])('%s steps with %s when the dialog has a query', (cmd, fn)=>{
      CMSearch.searchPanelOpen.mockReturnValue(true);
      CMSearch.getSearchQuery.mockReturnValue({valid: true});

      expect(binding[cmd](view)).toBe(true);
      expect(CMSearch[fn]).toHaveBeenCalledWith(view);
      expect(openFind).not.toHaveBeenCalled();
    });

    it.each([
      ['closed', false, true],
      ['open with no query', true, false],
    ])('opens the dialog when it is %s', (_desc, open, valid)=>{
      CMSearch.searchPanelOpen.mockReturnValue(open);
      CMSearch.getSearchQuery.mockReturnValue({valid});

      expect(binding.run(view)).toBe(true);
      expect(binding.shift(view)).toBe(true);
      expect(openFind).toHaveBeenCalledTimes(2);
      expect(CMSearch.findNext).not.toHaveBeenCalled();
      expect(CMSearch.findPrevious).not.toHaveBeenCalled();
    });
  });
});

describe('CodeMirror Tab key binding', ()=>{
  const pressTab = (readOnly, shiftKey)=>{
    const view = new EditorView({state: EditorState.create({
      doc: '  select 1',
      extensions: [keymap.of([tabKeyBinding]), EditorState.readOnly.of(readOnly)],
    })});
    const handled = runScopeHandlers(view, new KeyboardEvent('keydown', {key: 'Tab', shiftKey}), 'editor');
    const doc = view.state.doc.toString();
    view.destroy();
    return {handled, doc};
  };

  it.each([
    ['Tab', false, '    select 1'],
    ['Shift+Tab', true, 'select 1'],
  ])('%s indents and is consumed in an editable editor', (_key, shiftKey, doc)=>{
    expect(pressTab(false, shiftKey)).toEqual({handled: true, doc});
  });

  it.each([
    ['Tab', false],
    ['Shift+Tab', true],
  ])('%s is left to the browser in a read-only editor', (_key, shiftKey)=>{
    expect(pressTab(true, shiftKey)).toEqual({handled: false, doc: '  select 1'});
  });
});
