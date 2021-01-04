/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {initialize} from 'sources/browser/server_groups/servers/databases/external_tables/external_tables';

describe('when external tables is loaded', () => {
  let pgBrowser;
  let gettext;
  let result;
  beforeEach(() => {
    pgBrowser = {
      Nodes: {},
    };
    pgBrowser.Collection = jasmine.createSpyObj('Collection', ['extend']);
    pgBrowser.Node = jasmine.createSpyObj('Node', ['extend', 'Model']);
    pgBrowser.Node.Model = jasmine.createSpyObj('Model', ['extend']);
    pgBrowser.Collection.extend.and.returnValue('extended object');
    pgBrowser.Node.extend.and.returnValue('extended node object');
    gettext = jasmine.createSpy('gettext').and.callFake((text) => text);
  });

  describe('when external tables is already defined', () => {
    beforeEach(() => {
      pgBrowser.Nodes['coll-external_table'] = {};
      result = initialize(pgBrowser, gettext);
    });

    it('does not reinitialize it', () => {
      expect(pgBrowser.Collection.extend).not.toHaveBeenCalled();
    });

    it('returns the not updated version of pgBrowser', () => {
      expect(result).toEqual(pgBrowser);
    });
  });

  describe('when external tables is not defined', () => {
    beforeEach(() => {
      result = initialize(pgBrowser, gettext);
    });

    it('initializes "coll-external_tables"', () => {
      expect(pgBrowser.Collection.extend).toHaveBeenCalled();
    });

    it('returns the updated version of pgBrowser', () => {
      expect(result.Nodes['coll-external_table']).not.toBeUndefined();
    });
  });
});
