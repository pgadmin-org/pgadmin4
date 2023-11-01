//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import checkNodeVisibility from '../../pgadmin/static/js/check_node_visibility';

describe('checkNodeVisibility', function () {
  let browser;

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
