/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {TreeFake} from '../tree/tree_fake';
import {showQueryTool} from '../../../pgadmin/tools/datagrid/static/js/show_query_tool';
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

describe('#showQueryTool', () => {
  let queryTool;
  let alertify;
  let transId = 98765432;
  beforeEach(() => {
    pgBrowser.preferences_cache = dummy_cache;
    alertify = jasmine.createSpyObj('alertify', ['alert']);
    queryTool = {
      launch_grid: jasmine.createSpy('launch_grid'),
    };
    pgBrowser.treeMenu = new TreeFake();
    pgBrowser.Nodes = {
      server_group: {
        _type: 'server_group',
        hasId: true,
      },
      server: {
        _type: 'server',
        hasId: true,
      },
      database: {
        _type: 'database',
        hasId: true,
      },
    };

    const parent = pgBrowser.treeMenu.addNewNode('parent', {_type: 'parent'});
    const serverGroup1 =  new TreeNode('server_group1', {
      _type: 'server_group',
      _id: 1,
    }, ['parent']);
    pgBrowser.treeMenu.addChild(parent, serverGroup1);

    const server1 = new TreeNode('server1', {
      _type: 'server',
      label: 'server1',
      server_type: 'pg',
      _id: 2,
      user: {name: 'someuser'},
      db: 'otherdblabel',
    });
    pgBrowser.treeMenu.addChild(serverGroup1, server1);

    const database1 = new  TreeNode('database1', {
      _type: 'database',
      label: 'database1',
      _id: 3,
    });
    pgBrowser.treeMenu.addChild(server1, database1);
  });

  context('cannot find the tree node', () => {
    beforeEach(() => {
      showQueryTool(queryTool, pgBrowser, alertify, '', [{id: '10'}], transId);
    });
    it('does not create a transaction', () => {
      expect(queryTool.launch_grid).not.toHaveBeenCalled();
    });

    it('display alert', () => {
      expect(alertify.alert).toHaveBeenCalledWith(
        'Query Tool Error',
        'No object selected.'
      );
    });
  });

  context('current node is not underneath a server', () => {
    it('does not create a transaction', () => {
      showQueryTool(queryTool, pgBrowser, alertify, '', [{id: 'parent'}], transId);
      expect(queryTool.launch_grid).not.toHaveBeenCalled();
    });

    it('no alert is displayed', () => {
      expect(alertify.alert).not.toHaveBeenCalled();
    });
  });

  context('current node is underneath a server', () => {
    context('current node is not underneath a database', () => {
      it('creates a transaction', () => {
        showQueryTool(queryTool, pgBrowser, alertify, 'http://someurl', [{id: 'server1'}], transId);
        expect(queryTool.launch_grid).toHaveBeenCalledWith(
          98765432,
          '/panel/98765432?is_query_tool=true&sgid=1&sid=2&server_type=pg',
          true,
          'otherdblabel/someuser@server1',
          'http://someurl'
        );
      });
    });

    context('current node is underneath a database', () => {
      it('creates a transaction', () => {
        showQueryTool(queryTool, pgBrowser, alertify, 'http://someurl', [{id: 'database1'}], transId);
        expect(queryTool.launch_grid).toHaveBeenCalledWith(
          98765432,
          '/panel/98765432?is_query_tool=true&sgid=1&sid=2&server_type=pg&did=3',
          true,
          'database1/someuser@server1',
          'http://someurl'
        );
      });
    });
  });
});
