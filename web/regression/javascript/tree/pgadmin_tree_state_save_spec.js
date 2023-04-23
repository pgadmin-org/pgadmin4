/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {pgBrowser, browserTreeState} from '../../../pgadmin/static/js/tree/pgadmin_tree_save_state';


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
    pgBrowser.tree = jasmine.createSpyObj('tree', ['itemData', 'pathId', 'hasParent', 'isOpen', 'isClosed', 'selected', 'parent']);
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
        pgBrowser.tree.itemData.and.returnValue(item);
        pgBrowser.tree.pathId.and.returnValue([]);
        pgBrowser.tree.hasParent.and.returnValue(false);
        pgBrowser.tree.isOpen.and.returnValue(true);
      });

      it('The tree current state will be empty', () => {
        browserTreeState.update_cache(item);
        expect(browserTreeState.current_state, {});
      });
    });

    describe('When server node is opened', () => {
      let item = {
        _type: 'server',
        hasId: true,
        id: 'server/1',
        _id: 1,
      };
      beforeEach(() => {
        pgBrowser.tree.itemData.and.returnValue(item);
        pgBrowser.tree.pathId.and.returnValue(['server_group/1']);
        pgBrowser.tree.hasParent.and.returnValue(true);
        pgBrowser.tree.isOpen.and.returnValue(true);
      });

      it('The tree current state will have server', () => {
        browserTreeState.update_cache(item);
        expect(browserTreeState.current_state, {1: {'paths': ['server_group/1,server/1']}});
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
        pgBrowser.tree.itemData.and.returnValue(item);
        pgBrowser.tree.pathId.and.returnValue(['server_group/1', 'server/1']);
        pgBrowser.tree.hasParent.and.returnValue(true);
        pgBrowser.tree.isOpen.and.returnValue(true);
        pgBrowser.tree.selected.and.returnValue(item);
      });

      it('The tree current state will have coll_database', () => {
        browserTreeState.update_cache(item);
        expect(browserTreeState.current_state, {1: {'paths': ['server_group/1,server/1,coll_database/1']}});
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
        pgBrowser.tree.itemData.and.returnValue(item);
        pgBrowser.tree.pathId.and.returnValue(['server_group/1', 'server/1', 'coll_database/1']);
        pgBrowser.tree.hasParent.and.returnValue(true);
        pgBrowser.tree.isOpen.and.returnValue(true);
        pgBrowser.tree.selected.and.returnValue(item);
      });

      it('The tree current state will have coll_database', () => {
        browserTreeState.update_cache(item);
        expect(browserTreeState.current_state, {1: {'paths': ['server_group/1,server/1,coll_database/1','database/10']}});
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
        pgBrowser.tree.itemData.and.returnValue(item);
        pgBrowser.tree.pathId.and.returnValue(['server_group/1', 'server/1']);
        pgBrowser.tree.hasParent.and.returnValue(true);
        pgBrowser.tree.isOpen.and.returnValue(true);
        pgBrowser.tree.isClosed.and.returnValue(true);
      });

      it('The tree current state will remove coll_database and database', () => {
        browserTreeState.update_cache(item);
        browserTreeState.remove_from_cache(item);
        expect(browserTreeState.current_state, {1: {'paths': ['server_group/1,server/1']}});
      });
    });

    describe('When server node is closed, both server and server_group should be removed', () => {
      let item = {
        _type: 'server',
        hasId: true,
        id: 'server/1',
        _id: 1,
      };
      beforeEach(() => {
        pgBrowser.tree.itemData.and.returnValue(item);
        pgBrowser.tree.pathId.and.returnValue(['server_group/1']);
        pgBrowser.tree.hasParent.and.returnValue(true);
        pgBrowser.tree.isOpen.and.returnValue(true);
        pgBrowser.tree.isClosed.and.returnValue(true);
      });

      it('The tree current state will remove server_group and server', () => {
        browserTreeState.remove_from_cache(item);
        expect(browserTreeState.current_state, {1: []});
      });
    });
  });

});
