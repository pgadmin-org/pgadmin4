//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import { setFocusToDebuggerEditor } from '../../pgadmin/tools/debugger/static/js/debugger_utils';

describe('debuggerUtils', function () {
  let editor;
  editor = jasmine.createSpyObj('editor', ['focus']);

  let tab_key = {
    which: 9,
    keyCode: 9,
  };

  let enter_key = {
    which: 13,
    keyCode: 13,
  };

  describe('debuggerUtils', function () {
    it('returns undefined if no command is passed', function () {
      expect(setFocusToDebuggerEditor(editor, null)).toEqual(undefined);
    });
  });

  describe('debuggerUtils', function () {
    it('should call focus on editor', function () {
      setFocusToDebuggerEditor(editor, enter_key);
      expect(editor.focus).toHaveBeenCalled();
    });
  });

  describe('debuggerUtils', function () {
    it('should not call focus on editor and returns undefined', function () {
      expect(setFocusToDebuggerEditor(editor, tab_key)).toEqual(undefined);
    });
  });
});
