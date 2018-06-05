/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {getPanelTitle} from '../../../pgadmin/tools/datagrid/static/js/get_panel_title';
import {TreeFake} from '../tree/tree_fake';
import {TreeNode} from '../../../pgadmin/static/js/tree/tree';

const context = describe;

describe('#getPanelTitle', () => {
  let pgBrowser;
  let tree;
  beforeEach(() => {
    tree = new TreeFake();
    pgBrowser = {
      treeMenu: tree,
      Nodes: {
        server: {
          hasId: true,
          _type: 'server',
        },
        database: {
          hasId: true,
          _type: 'database',
        },
      },
    };
  });

  context('selected node does not belong to a server', () => {
    it('returns undefined', () => {
      const root = tree.addNewNode('level1', {_type: 'server_groups'});
      tree.addChild(root, new TreeNode('level1.1', {_type: 'other'}));
      tree.selectNode([{id: 'level1'}]);
      expect(getPanelTitle(pgBrowser)).toBeUndefined();
    });
  });

  context('selected node belong to a server', () => {
    context('selected node does not belong to a database', () => {
      it('returns the server label and the username', () => {
        tree.addNewNode('level1', {
          _type: 'server',
          db: 'other db label',
          user: {name: 'some user name'},
          label: 'server label',
        }, []);

        tree.selectNode([{id: 'level1'}]);
        expect(getPanelTitle(pgBrowser))
          .toBe('other db label on some user name@server label');
      });
    });

    context('selected node belongs to a database', () => {
      it('returns the database label and the username', () => {
        const root = tree.addNewNode('level1', {
          _type: 'server',
          db: 'other db label',
          user: {name: 'some user name'},
          label: 'server label',
        });
        const level1 = new TreeNode('level1.1', {
          _type: 'database',
          label: 'db label',
        });
        tree.addChild(root, level1);
        tree.addChild(level1,
          new TreeNode('level1.1.1', {_type: 'table'}));
        tree.selectNode([{id: 'level1.1.1'}]);
        expect(getPanelTitle(pgBrowser))
          .toBe('db label on some user name@server label');
      });
    });
  });
});
