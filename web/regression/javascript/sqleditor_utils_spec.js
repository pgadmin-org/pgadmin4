//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

define(['sources/sqleditor_utils'],
  function (SqlEditorUtils) {
    describe('SqlEditorUtils', function () {
      describe('Calculate font size of input number passed', function () {
        it('calcFontSize', function () {
          expect(SqlEditorUtils.calcFontSize(1.456)).toEqual('1.46em');
          expect(SqlEditorUtils.calcFontSize()).toEqual('1em');
          expect(SqlEditorUtils.calcFontSize(2)).toEqual('2em');
        });
      });
    });
  });
