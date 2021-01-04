//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

define(['sources/check_node_visibility'],
  function (checkNodeVisibility) {
    describe('checkNodeVisibility', function () {

      var browser;

      browser = jasmine.createSpyObj('browser', [
        'node_preference_data', 'get_preference']
      );

      describe('when node is server collection', function () {
        it('returns true', function () {
          expect(checkNodeVisibility(browser, 'coll-server')).toEqual(true);
        });
      });

      describe('when node is server', function () {
        it('returns true', function () {
          expect(checkNodeVisibility(browser, 'server')).toEqual(true);
        });
      });
    });
  });
