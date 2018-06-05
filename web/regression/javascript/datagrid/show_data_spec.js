/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {showDataGrid} from '../../../pgadmin/tools/datagrid/static/js/show_data';
import {TreeFake} from '../tree/tree_fake';
import {TreeNode} from '../../../pgadmin/static/js/tree/tree';

const context = describe;

describe('#show_data', () => {
  let datagrid;
  let pgBrowser;
  let alertify;
  beforeEach(() => {
    alertify = jasmine.createSpyObj('alertify', ['alert']);
    datagrid = {
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
        schema: {
          _type: 'schema',
          hasId: true,
        },
        view: {
          _type: 'view',
          hasId: true,
        },
        catalog: {
          _type: 'catalog',
          hasId: true,
        },
      },
    };
    const parent = pgBrowser.treeMenu.addNewNode('parent', {_type: 'parent'}, []);
    const serverGroup1 = new TreeNode('server_group1', {
      _type: 'server_group',
      _id: 1,
    });
    pgBrowser.treeMenu.addChild(parent, serverGroup1);

    const server1 = new TreeNode('server1', {
      _type: 'server',
      label: 'server1',
      server_type: 'pg',
      _id: 2,
    }, ['parent', 'server_group1']);
    pgBrowser.treeMenu.addChild(serverGroup1, server1);

    const database1 = new TreeNode('database1', {
      _type: 'database',
      label: 'database1',
      _id: 3,
    }, ['parent', 'server_group1', 'server1']);
    pgBrowser.treeMenu.addChild(server1, database1);

    const schema1 = new TreeNode('schema1', {
      _type: 'schema',
      label: 'schema1',
      _id: 4,
    });
    pgBrowser.treeMenu.addChild(database1, schema1);

    const view1 = new TreeNode('view1', {
      _type: 'view',
      label: 'view1',
      _id: 5,
    }, ['parent', 'server_group1', 'server1', 'database1']);
    pgBrowser.treeMenu.addChild(database1, view1);

    const catalog1 = new TreeNode('catalog1', {
      _type: 'catalog',
      label: 'catalog1',
      _id: 6,
    }, ['parent', 'server_group1', 'server1', 'database1']);
    pgBrowser.treeMenu.addChild(database1, catalog1);
  });

  context('cannot find the tree node', () => {
    it('does not create a transaction', () => {
      showDataGrid(datagrid, pgBrowser, alertify, {}, [{id: '10'}]);
      expect(datagrid.create_transaction).not.toHaveBeenCalled();
    });

    it('display alert', () => {
      showDataGrid(datagrid, pgBrowser, alertify, {}, [{id: '10'}]);
      expect(alertify.alert).toHaveBeenCalledWith(
        'Data Grid Error',
        'No object selected.'
      );
    });
  });

  context('current node is not underneath a server', () => {
    it('does not create a transaction', () => {
      showDataGrid(datagrid, pgBrowser, alertify, {}, [{id: 'parent'}]);
      expect(datagrid.create_transaction).not.toHaveBeenCalled();
    });
  });

  context('current node is not underneath a schema or view or catalog', () => {
    it('does not create a transaction', () => {
      showDataGrid(datagrid, pgBrowser, alertify, {}, [{id: 'database1'}]);
      expect(datagrid.create_transaction).not.toHaveBeenCalled();
    });
  });

  context('current node is underneath a schema', () => {
    it('does not create a transaction', () => {
      showDataGrid(datagrid, pgBrowser, alertify, {mnuid: 11}, [{id: 'schema1'}]);
      expect(datagrid.create_transaction).toHaveBeenCalledWith(
        '/initialize/datagrid/11/schema/1/2/3/4',
        null,
        'false',
        'pg',
        '',
        'server1 - database1 - schema1.schema1',
        ''
      );
    });
  });

  context('current node is underneath a view', () => {
    it('does not create a transaction', () => {
      showDataGrid(datagrid, pgBrowser, alertify, {mnuid: 11}, [{id: 'view1'}]);
      expect(datagrid.create_transaction).toHaveBeenCalledWith(
        '/initialize/datagrid/11/view/1/2/3/5',
        null,
        'false',
        'pg',
        '',
        'server1 - database1 - view1.view1',
        ''
      );
    });
  });

  context('current node is underneath a catalog', () => {
    it('does not create a transaction', () => {
      showDataGrid(datagrid, pgBrowser, alertify, {mnuid: 11}, [{id: 'catalog1'}]);
      expect(datagrid.create_transaction).toHaveBeenCalledWith(
        '/initialize/datagrid/11/catalog/1/2/3/6',
        null,
        'false',
        'pg',
        '',
        'server1 - database1 - catalog1.catalog1',
        ''
      );
    });
  });
});
