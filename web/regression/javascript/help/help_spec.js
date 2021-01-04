//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import { getHelpUrl } from '../../../pgadmin/help/static/js/help';

describe('Test help functions', function() {
  describe('when getHelpUrl is called', function(){

    // PG 9.6 docs
    it('it should be able to return a correct URL for PG 9.6 docs with a trailing slash', function() {
      expect(getHelpUrl('https://www.postgresql.org/docs/$VERSION$/', 'index.html', 90600, 'pg')).toEqual('https://www.postgresql.org/docs/9.6/index.html');
    });

    // PG 10 docs
    it('it should be able to return a correct URL for PG 10 docs with a trailing slash', function() {
      expect(getHelpUrl('https://www.postgresql.org/docs/$VERSION$/', 'index.html', 100000, 'pg')).toEqual('https://www.postgresql.org/docs/10/index.html');
    });

    // PG 11 docs
    it('it should be able to return a correct URL for PG 11 docs with a trailing slash', function() {
      expect(getHelpUrl('https://www.postgresql.org/docs/$VERSION$/', 'index.html', 110000, 'pg')).toEqual('https://www.postgresql.org/docs/11/index.html');
    });

    // PG 12 docs
    it('it should be able to return a correct URL for PG 12 docs with a trailing slash', function() {
      expect(getHelpUrl('https://www.postgresql.org/docs/$VERSION$/', 'index.html', 120000, 'pg')).toEqual('https://www.postgresql.org/docs/12/index.html');
    });

    // PG 9.6 docs
    it('it should be able to return a correct URL for PG 9.6 docs without a trailing slash', function() {
      expect(getHelpUrl('https://www.postgresql.org/docs/$VERSION$', 'index.html', 90600, 'pg')).toEqual('https://www.postgresql.org/docs/9.6/index.html');
    });

    // PG 10 docs
    it('it should be able to return a correct URL for PG 10 docs without a trailing slash', function() {
      expect(getHelpUrl('https://www.postgresql.org/docs/$VERSION$', 'index.html', 100000, 'pg')).toEqual('https://www.postgresql.org/docs/10/index.html');
    });

    // PG 11 docs
    it('it should be able to return a correct URL for PG 11 docs without a trailing slash', function() {
      expect(getHelpUrl('https://www.postgresql.org/docs/$VERSION$', 'index.html', 110500, 'pg')).toEqual('https://www.postgresql.org/docs/11/index.html');
    });

    // PG 12 docs
    it('it should be able to return a correct URL for PG 12 docs without a trailing slash', function() {
      expect(getHelpUrl('https://www.postgresql.org/docs/$VERSION$', 'index.html', 121000, 'pg')).toEqual('https://www.postgresql.org/docs/12/index.html');
    });

    // EPAS 9.6 docs
    it('it should be able to return a correct URL for EPAS 9.6 docs with a trailing slash', function() {
      expect(getHelpUrl('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/$VERSION$/', 'index.html', 90600, 'ppas')).toEqual('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/9.6.0/index.html');
    });

    // EPAS 10 docs
    it('it should be able to return a correct URL for EPAS 10 docs with a trailing slash', function() {
      expect(getHelpUrl('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/$VERSION$/', 'index.html', 100000, 'ppas')).toEqual('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/10.0/index.html');
    });

    // EPAS 11 docs
    it('it should be able to return a correct URL for EPAS 11 docs with a trailing slash', function() {
      expect(getHelpUrl('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/$VERSION$/', 'index.html', 110000, 'ppas')).toEqual('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/11.0/index.html');
    });

    // EPAS 12 docs
    it('it should be able to return a correct URL for EPAS 12 docs with a trailing slash', function() {
      expect(getHelpUrl('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/$VERSION$/', 'index.html', 120000, 'ppas')).toEqual('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/12.0/index.html');
    });

    // EPAS 9.6.15 docs
    it('it should be able to return a correct URL for EPAS 9.6.15 docs without a trailing slash', function() {
      expect(getHelpUrl('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/$VERSION$', 'index.html', 90615, 'ppas')).toEqual('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/9.6.15/index.html');
    });

    // EPAS 10.13 docs
    it('it should be able to return a correct URL for EPAS 10.13 docs without a trailing slash', function() {
      expect(getHelpUrl('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/$VERSION$', 'index.html', 101300, 'ppas')).toEqual('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/10.13/index.html');
    });

    // EPAS 11.5 docs
    it('it should be able to return a correct URL for EPAS 11.5 docs without a trailing slash', function() {
      expect(getHelpUrl('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/$VERSION$', 'index.html', 110500, 'ppas')).toEqual('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/11.5/index.html');
    });

    // EPAS 12.3 docs
    it('it should be able to return a correct URL for EPAS 12.3 docs without a trailing slash', function() {
      expect(getHelpUrl('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/$VERSION$', 'index.html', 120300, 'ppas')).toEqual('https://www.enterprisedb.com/edb-docs/d/postgresql/reference/manual/12.3/index.html');
    });
  });
});
