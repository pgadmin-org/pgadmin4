//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
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

      describe('Remove the slashes', function () {
        it('it will remove the slashes', function () {
          expect(
            SqlEditorUtils.removeSlashInTheString('/')
          ).toEqual({
            'slashLocations': '0',
            'title': '',
          });
        });

        it('it will remove if slashes are present', function () {
          expect(
            SqlEditorUtils.removeSlashInTheString('my/test')
          ).toEqual({
            'slashLocations': '2',
            'title': 'mytest',
          });
        });

        it('it will remove all the slashes are present', function () {
          expect(
            SqlEditorUtils.removeSlashInTheString('my/test/value')
          ).toEqual({
            'slashLocations': '2,7',
            'title': 'mytestvalue',
          });
        });

        it('it will remove all the slashes are present', function () {
          expect(
            SqlEditorUtils.removeSlashInTheString('a/bb/ccc/dddd/eeeee')
          ).toEqual({
            'slashLocations': '1,4,8,13',
            'title': 'abbcccddddeeeee',
          });
        });

        it('it will not remove if slash is not present', function () {
          expect(
            SqlEditorUtils.removeSlashInTheString('mytest')
          ).toEqual({
            'slashLocations': '',
            'title': 'mytest',
          });
        });

        it('it will not remove if value is not present', function () {
          expect(
            SqlEditorUtils.removeSlashInTheString('')
          ).toEqual({
            'slashLocations': '',
            'title': '',
          });
        });
      });
    });
  });
