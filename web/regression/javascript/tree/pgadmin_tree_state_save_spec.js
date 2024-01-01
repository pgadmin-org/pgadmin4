/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import {pgBrowser, browserTreeState} from '../../../pgadmin/static/js/tree/pgadmin_tree_save_state';
import {waitFor} from '@testing-library/react';


describe('#browserTreeState', () => {
  beforeEach(() => {

    pgBrowser.Nodes = {
      server_group: {
        _type: 'server_group',
        hasId: true,
        id: 'server_group/1',
        _id: 1,
        getTreeNodeHierarchy: function() { return {
          server_group: {
            _type: 'server_group',
            hasId: true,
            id: 'server_group/1',
            _id: 1,
          },
        };},
      },
      server: {
        _type: 'server',
        hasId: true,
        id: 'server/1',
        _id: 1,
        connected: true,
        getTreeNodeHierarchy: function() { return {
          server_group: {
            _type: 'server_group',
            hasId: true,
            id: 'server_group/1',
            _id: 1,
          },
          server: {
            _type: 'server',
            hasId: true,
            id: 'server/1',
            _id: 1,
            connected: true,
          },
        };},
      },
      coll_database: {
        _type: 'coll_database',
        hasId: false,
        id: 'coll_database/1',
        _id: 1,
        getTreeNodeHierarchy: function() { return {
          server_group: {
            _type: 'server_group',
            hasId: true,
            id: 'server_group/1',
            _id: 1,
          },
          server: {
            _type: 'server',
            hasId: true,
            id: 'server/1',
            _id: 1,
            connected: true,
          },
          coll_database: {
            _type: 'coll_database',
            hasId: true,
            id: 'coll_database/1',
            _id: 1,
          },
        };},
      },
      database: {
        _type: 'database',
        hasId: true,
        id: 'database/10',
        _id: 10,
        getTreeNodeHierarchy: function() { return {
          server_group: {
            _type: 'server_group',
            hasId: true,
            id: 'server_group/1',
            _id: 1,
          },
          server: {
            _type: 'server',
            hasId: true,
            id: 'server/1',
            _id: 1,
            connected: true,
          },
          coll_database: {
            _type: 'coll_database',
            hasId: true,
            id: 'coll_database/1',
            _id: 1,
          },
          database: {
            _type: 'database',
            hasId: true,
            id: 'database/10',
            _id: 10,
          },
        };},
      },
    };

    jest.spyOn(pgAdmin.Browser.notifier, 'success');
    jest.spyOn(pgAdmin.Browser.notifier, 'error');

    pgBrowser.tree = {'itemData': jest.fn(), 'pathId': jest.fn(), 'hasParent': jest.fn(), 'isOpen': jest.fn(), 'isClosed': jest.fn(), 'selected': jest.fn(), 'parent': jest.fn()};
    pgBrowser.tree.getTreeNodeHierarchy = function (item) {
      return pgBrowser.Nodes[item._type].getTreeNodeHierarchy();
    };
  });

  describe('When node is opened tree state is getting updated', () => {

    describe('When tree node server group is opened', () => {
      let item = {
        _type: 'server_group',
        hasId: true,
        id: 'server_group/1',
        _id: 1,
      };
      beforeEach(() => {
        pgBrowser.tree.itemData.mockReturnValue(item);
        pgBrowser.tree.pathId.mockReturnValue([]);
        pgBrowser.tree.hasParent.mockReturnValue(false);
        pgBrowser.tree.isOpen.mockReturnValue(true);
      });

      it('The tree current state will be empty', () => {
        browserTreeState.update_cache(item);
        expect(browserTreeState.current_state).toMatchObject({});
      });
    });

    describe('When server node is opened', () => {
      let item = {
        _type: 'server',
        hasId: true,
        id: 'server/1',
        _id: 1,
        connected: true,
      };
      beforeEach(() => {
        pgBrowser.tree.itemData.mockReturnValue(item);
        pgBrowser.tree.pathId.mockReturnValue(['server_group/1']);
        pgBrowser.tree.hasParent.mockReturnValue(true);
        pgBrowser.tree.isOpen.mockReturnValue(true);
      });

      it('The tree current state will have server', async () => {
        browserTreeState.update_cache(item);
        await waitFor(()=>{
          expect(browserTreeState.current_state).toMatchObject({1: {'paths': ['server_group/1,server/1']}});
        }, {timeout: 500});
      });
    });

    describe('When coll_database node is opened', () => {
      let item = {
        _type: 'coll_database',
        hasId: true,
        id: 'coll_database/1',
        _id: 1,
      };
      beforeEach(() => {
        pgBrowser.tree.itemData.mockReturnValue(item);
        pgBrowser.tree.pathId.mockReturnValue(['server_group/1', 'server/1']);
        pgBrowser.tree.hasParent.mockReturnValue(true);
        pgBrowser.tree.isOpen.mockReturnValue(true);
        pgBrowser.tree.selected.mockReturnValue(item);
      });

      it('The tree current state will have coll_database', () => {
        browserTreeState.update_cache(item);
        expect(browserTreeState.current_state).toMatchObject({1: {'paths': ['server_group/1,server/1,coll_database/1']}});
      });
    });

    describe('When database node is opened', () => {
      let item = {
        _type: 'database',
        hasId: true,
        id: 'database/10',
        _id: 10,
      };
      beforeEach(() => {
        pgBrowser.tree.itemData.mockReturnValue(item);
        pgBrowser.tree.pathId.mockReturnValue(['server_group/1', 'server/1', 'coll_database/1']);
        pgBrowser.tree.hasParent.mockReturnValue(true);
        pgBrowser.tree.isOpen.mockReturnValue(true);
        pgBrowser.tree.selected.mockReturnValue(item);
      });

      it('The tree current state will have coll_database', () => {
        browserTreeState.update_cache(item);
        expect(browserTreeState.current_state).toMatchObject({1: {'paths': ['server_group/1,server/1,coll_database/1,database/10']}});
      });
    });



    describe('When coll_database node is closed, both database and coll_database should be removed', () => {
      let item = {
        _type: 'coll_database',
        hasId: true,
        id: 'coll_database/1',
        _id: 1,
      };
      beforeEach(() => {
        pgBrowser.tree.itemData.mockReturnValue(item);
        pgBrowser.tree.pathId.mockReturnValue(['server_group/1', 'server/1']);
        pgBrowser.tree.hasParent.mockReturnValue(true);
        pgBrowser.tree.isOpen.mockReturnValue(true);
        pgBrowser.tree.isClosed.mockReturnValue(true);
      });

      it('The tree current state will remove coll_database and database', () => {
        browserTreeState.update_cache(item);
        browserTreeState.remove_from_cache(item);
        expect(browserTreeState.current_state).toMatchObject({1: {'paths': ['server_group/1,server/1']}});
      });
    });
  });

});
