//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

define(['sources/sqleditor_utils'],
function (SqlEditorUtils) {
  describe('SqlEditorUtils', function () {

    describe('Generate a random string of size 10', function () {
      it('returns string of length 10', function () {
        expect(SqlEditorUtils.epicRandomString(10).length).toEqual(10);
      });
    });

    describe('Generate a unique hash for given string', function () {
      it('returns unique hash', function () {
        expect(SqlEditorUtils.getHash('select * from test')).toEqual(403379630);
      });
    });

    describe('Capitalize the first letter of given string', function () {
      it('returns string with First letter Capital', function () {
        expect(SqlEditorUtils.capitalizeFirstLetter('create script')).toEqual('Create script');
      });
    });

    describe('Calculate font size of input number passed', function () {
      it('calcFontSize', function () {
        expect(SqlEditorUtils.calcFontSize(1.456)).toEqual('1.46em');
        expect(SqlEditorUtils.calcFontSize()).toEqual('1em');
        expect(SqlEditorUtils.calcFontSize(2)).toEqual('2em');
      });
    });
  });
});
