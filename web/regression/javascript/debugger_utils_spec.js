//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import {
  setFocusToDebuggerEditor,
  getProcedureId,
} from '../../pgadmin/tools/debugger/static/js/debugger_utils';

describe('setFocusToDebuggerEditor', function () {
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

  describe('setFocusToDebuggerEditor', function () {
    it('returns undefined if no command is passed', function () {
      expect(setFocusToDebuggerEditor(editor, null)).toEqual(undefined);
    });
  });

  describe('setFocusToDebuggerEditor', function () {
    it('should call focus on editor', function () {
      setFocusToDebuggerEditor(editor, enter_key);
      expect(editor.focus).toHaveBeenCalled();
    });
  });

  describe('setFocusToDebuggerEditor', function () {
    it('should not call focus on editor and returns undefined', function () {
      expect(setFocusToDebuggerEditor(editor, tab_key)).toEqual(undefined);
    });
  });
});

describe('getProcedureId', function () {
  let treeInfroProc = {
    'procedure': {
      '_id': 123,
    },
  };
  let treeInfroInvalidProcId = {
    'procedure': {
      '_id': null,
    },
  };
  let treeInfroEdbProc = {
    'edbproc': {
      '_id': 321,
    },
  };
  let fakeTreeInfro;

  describe('Should return proper object id', function () {
    it('returns valid procedure id', function () {
      expect(getProcedureId(treeInfroProc)).toEqual(123);
    });

    it('returns valid edbproc id', function () {
      expect(getProcedureId(treeInfroEdbProc)).toEqual(321);
    });

    it('returns undefined for fake tree info', function () {
      expect(getProcedureId(fakeTreeInfro)).toEqual(undefined);
    });

    it('returns undefined for invalid procedure id', function () {
      expect(getProcedureId(treeInfroInvalidProcId)).toEqual(undefined);
    });
  });
});

