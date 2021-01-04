/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {getPanelTitle} from '../../../pgadmin/tools/datagrid/static/js/datagrid_panel_title';
import {TreeFake} from '../tree/tree_fake';
import {TreeNode} from '../../../pgadmin/static/js/tree/tree';
import {pgBrowser} from 'pgadmin.browser.preferences';

const context = describe;

var dummy_cache = [
  {
    id: 1,
    mid: 1,
    module:'browser',
    name:'qt_tab_title_placeholder',
    value: '%DATABASE%/%USERNAME%@%SERVER%',
  },
];

describe('#getPanelTitle', () => {
  let tree;
  beforeEach(() => {
    pgBrowser.preferences_cache = dummy_cache;
    tree = new TreeFake();
    pgBrowser.Nodes = {
      server: {
        hasId: true,
        _type: 'server',
      },
      database: {
        hasId: true,
        _type: 'database',
      },
    };
    pgBrowser.treeMenu = tree;
    pgBrowser.preferences = {
      'qt_tab_title_placeholder': '',
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
          .toEqual('other db label/some user name@server label');
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
          .toEqual('db label/some user name@server label');
      });
    });
  });
});
