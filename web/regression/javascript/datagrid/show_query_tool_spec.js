/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {TreeFake} from '../tree/tree_fake';
import {showQueryTool} from '../../../pgadmin/tools/datagrid/static/js/show_query_tool';
import {TreeNode} from '../../../pgadmin/static/js/tree/tree';

const context = describe;

describe('#showQueryTool', () => {
  let queryTool;
  let pgBrowser;
  let alertify;
  beforeEach(() => {
    alertify = jasmine.createSpyObj('alertify', ['alert']);
    queryTool = {
      create_transaction: jasmine.createSpy('create_transaction'),
    };
    pgBrowser = {
      treeMenu: new TreeFake(),
      Nodes: {
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
      showQueryTool(queryTool, pgBrowser, alertify, '', [{id: '10'}], 'title');
    });
    it('does not create a transaction', () => {
      expect(queryTool.create_transaction).not.toHaveBeenCalled();
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
      showQueryTool(queryTool, pgBrowser, alertify, '', [{id: 'parent'}], 'title');
      expect(queryTool.create_transaction).not.toHaveBeenCalled();
    });

    it('no alert is displayed', () => {
      expect(alertify.alert).not.toHaveBeenCalled();
    });
  });

  context('current node is underneath a server', () => {
    context('current node is not underneath a database', () => {
      it('creates a transaction', () => {
        showQueryTool(queryTool, pgBrowser, alertify, 'http://someurl', [{id: 'server1'}], 'title');
        expect(queryTool.create_transaction).toHaveBeenCalledWith(
          '/initialize/query_tool/1/2',
          null,
          'true',
          'pg',
          'http://someurl',
          'title',
          '',
          false
        );
      });
    });

    context('current node is underneath a database', () => {
      it('creates a transaction', () => {
        showQueryTool(queryTool, pgBrowser, alertify, 'http://someurl', [{id: 'database1'}], 'title');
        expect(queryTool.create_transaction).toHaveBeenCalledWith(
          '/initialize/query_tool/1/2/3',
          null,
          'true',
          'pg',
          'http://someurl',
          'title',
          '',
          false
        );
      });
    });
  });
});
