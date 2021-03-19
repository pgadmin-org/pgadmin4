/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {showDataGrid} from '../../../pgadmin/tools/datagrid/static/js/show_data';
import {TreeFake} from '../tree/tree_fake';
import {TreeNode} from '../../../pgadmin/static/js/tree/tree';
import {pgBrowser} from 'pgadmin.browser.preferences';

const context = describe;

var dummy_cache = [
  {
    id: 1,
    mid: 1,
    module:'browser',
    name:'vw_edt_tab_title_placeholder',
    value: '%SCHEMA%.%TABLE%/%DATABASE%/%USERNAME%@%SERVER%',
  },
];

describe('#show_data', () => {
  let datagrid;
  let alertify;
  let transId = 98765432;
  beforeEach(() => {
    pgBrowser.preferences_cache = dummy_cache;
    alertify = jasmine.createSpyObj('alertify', ['alert', 'error']);
    datagrid = {
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
      user: {name: 'someuser'},
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
      showDataGrid(datagrid, pgBrowser, alertify, {}, [{id: '10'}], transId);
      expect(datagrid.launch_grid).not.toHaveBeenCalled();
    });

    it('display alert', () => {
      showDataGrid(datagrid, pgBrowser, alertify, {}, [{id: '10'}], transId);
      expect(alertify.alert).toHaveBeenCalledWith(
        'Data Grid Error',
        'No object selected.'
      );
    });
  });

  context('current node is not underneath a server', () => {
    it('does not create a transaction', () => {
      showDataGrid(datagrid, pgBrowser, alertify, {}, [{id: 'parent'}], transId);
      expect(datagrid.launch_grid).not.toHaveBeenCalled();
    });
  });

  context('current node is not underneath a schema or view or catalog', () => {
    it('does not create a transaction', () => {
      showDataGrid(datagrid, pgBrowser, alertify, {}, [{id: 'database1'}], transId);
      expect(datagrid.launch_grid).not.toHaveBeenCalled();
    });
  });

  context('current node is underneath a schema', () => {
    it('does not create a transaction', () => {
      showDataGrid(datagrid, pgBrowser, alertify, {mnuid: 11}, [{id: 'schema1'}], transId);
      expect(datagrid.launch_grid).not.toHaveBeenCalled();
    });
  });

  context('current node is underneath a view', () => {
    it('does not create a transaction', () => {
      showDataGrid(datagrid, pgBrowser, alertify, {mnuid: 11}, [{id: 'view1'}], transId);

      expect(datagrid.launch_grid).toHaveBeenCalledWith(
        98765432,
        '/panel/98765432?is_query_tool=false&cmd_type=11&obj_type=view&obj_id=5&sgid=1&sid=2&did=3&server_type=pg',
        false,
        'view1.view1/database1/someuser@server1'
      );
    });
  });

  context('current node is underneath a catalog', () => {
    it('does not create a transaction', () => {
      showDataGrid(datagrid, pgBrowser, alertify, {mnuid: 11}, [{id: 'catalog1'}], transId);
      expect(datagrid.launch_grid).not.toHaveBeenCalled();
    });
  });
});
