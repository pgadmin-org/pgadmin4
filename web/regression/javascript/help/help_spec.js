//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import { getHelpUrl } from '../../../pgadmin/help/static/js/help';

describe('Test help functions', function() {
  describe('when getHelpUrl is called', function(){

    // PG 9.6 docs
    it('it should be able to return a correct URL for PG 9.6 docs with a trailing slash', function() {
      expect(getHelpUrl('https://www.postgresql.org/docs/$VERSION$/', 'index.html', 90600)).toEqual('https://www.postgresql.org/docs/9.6/index.html');
    });

    // PG 10 docs
    it('it should be able to return a correct URL for PG 10 docs with a trailing slash', function() {
      expect(getHelpUrl('https://www.postgresql.org/docs/$VERSION$/', 'index.html', 100000)).toEqual('https://www.postgresql.org/docs/10/index.html');
    });

    // PG 9.6 docs
    it('it should be able to return a correct URL for PG 9.6 docs without a trailing slash', function() {
      expect(getHelpUrl('https://www.postgresql.org/docs/$VERSION$', 'index.html', 90600)).toEqual('https://www.postgresql.org/docs/9.6/index.html');
    });

    // PG 10 docs
    it('it should be able to return a correct URL for PG 10 docs without a trailing slash', function() {
      expect(getHelpUrl('https://www.postgresql.org/docs/$VERSION$', 'index.html', 100000)).toEqual('https://www.postgresql.org/docs/10/index.html');
    });

    // EPAS 9.6 docs
    it('it should be able to return a correct URL for EPAS 9.6 docs with a trailing slash', function() {
      expect(getHelpUrl('https://www.enterprisedb.com/docs/en/$VERSION$/pg/', 'index.html', 90600)).toEqual('https://www.enterprisedb.com/docs/en/9.6/pg/index.html');
    });

    // EPAS 10 docs
    it('it should be able to return a correct URL for EPAS 10 docs with a trailing slash', function() {
      expect(getHelpUrl('https://www.enterprisedb.com/docs/en/$VERSION$/pg/', 'index.html', 100000)).toEqual('https://www.enterprisedb.com/docs/en/10/pg/index.html');
    });

    // EPAS 9.6 docs
    it('it should be able to return a correct URL for EPAS 9.6 docs without a trailing slash', function() {
      expect(getHelpUrl('https://www.enterprisedb.com/docs/en/$VERSION$/pg', 'index.html', 90600)).toEqual('https://www.enterprisedb.com/docs/en/9.6/pg/index.html');
    });

    // EPAS 10 docs
    it('it should be able to return a correct URL for EPAS 10 docs without a trailing slash', function() {
      expect(getHelpUrl('https://www.enterprisedb.com/docs/en/$VERSION$/pg', 'index.html', 100000)).toEqual('https://www.enterprisedb.com/docs/en/10/pg/index.html');
    });

  });
});
