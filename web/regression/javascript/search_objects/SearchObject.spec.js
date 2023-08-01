/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {TreeFake} from '../tree/tree_fake';
import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import Theme from '../../../pgadmin/static/js/Theme';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import pgAdmin from 'sources/pgadmin';
import SearchObjects from '../../../pgadmin/tools/search_objects/static/js/SearchObjects';
import { TreeNode } from '../../../pgadmin/static/js/tree/tree_nodes';

const nodeData = {server: {'_id' : 10}, database: {'_id': 123}};

describe('SearchObjects', ()=>{
  let mount, networkMock;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
    networkMock = new MockAdapter(axios);
    networkMock.onGet('/search_objects/types/10/123').reply(200, {data: [{cast: 'Casts', function: 'Functions'}]});
    networkMock.onGet('/search_objects/search/10/123').reply(200, {data: [
      {
        'name': 'plpgsql',
        'type': 'extension',
        'type_label': 'Extensions',
        'path': ':extension.13315:/plpgsql',
        'show_node': true,
        'other_info': null,
        'catalog_level': 'N'
      },
      {
        'name': 'plpgsql_call_handler',
        'type': 'function',
        'type_label': 'Functions',
        'path': ':schema.11:/PostgreSQL Catalog (pg_catalog)/:function.13316:/plpgsql_call_handler',
        'show_node': true,
        'other_info': '',
        'catalog_level': 'D'
      },
      {
        'name': 'plpgsql_inline_handler',
        'type': 'function',
        'type_label': 'Functions',
        'path': ':schema.11:/PostgreSQL Catalog (pg_catalog)/:function.13317:/plpgsql_inline_handler',
        'show_node': true,
        'other_info': 'internal',
        'catalog_level': 'D'
      },
      {
        'name': 'plpgsql_validator',
        'type': 'function',
        'type_label': 'Functions',
        'path': ':schema.11:/PostgreSQL Catalog (pg_catalog)/:function.13318:/plpgsql_validator',
        'show_node': true,
        'other_info': 'oid',
        'catalog_level': 'D'
      },
      {
        'name': 'plpgsql',
        'type': 'language',
        'type_label': 'Languages',
        'path': ':language.13319:/plpgsql',
        'show_node': true,
        'other_info': null,
        'catalog_level': 'N'
      }
    ]});
  });

  afterAll(() => {
    mount.cleanUp();
    networkMock.restore();
  });

  beforeEach(()=>{
    jasmineEnzyme();
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.Nodes = {
      server: {
        hasId: true,
        getTreeNodeHierarchy: jasmine.createSpy('getTreeNodeHierarchy'),
      },
      database: {
        hasId: true,
        getTreeNodeHierarchy: jasmine.createSpy('getTreeNodeHierarchy'),
      },
      'coll-sometype': {
        type: 'coll-sometype',
        hasId: false,
        label: 'Some types coll',
      },
      sometype: {
        type: 'sometype',
        hasId: true,
      },
      someothertype: {
        type: 'someothertype',
        hasId: true,
        collection_type: 'coll-sometype',
      },
      'coll-edbfunc': {
        type: 'coll-edbfunc',
        hasId: true,
        label: 'Functions',
      },
      'coll-edbproc': {
        type: 'coll-edbfunc',
        hasId: true,
        label: 'Procedures',
      },
      'coll-edbvar': {
        type: 'coll-edbfunc',
        hasId: true,
        label: 'Variables',
      },
    };
    pgAdmin.Browser.tree = new TreeFake(pgAdmin.Browser);

    let serverTreeNode = pgAdmin.Browser.tree.addNewNode('level2.1', {
        _type: 'server',
        _id: 10,
        label: 'some-tree-label',
      }, [{id: 'level2.1'}]),
      databaseTreeNode = new TreeNode('database-tree-node', {
        _type: 'database',
        _id: 123,
        _label: 'some-database-label',
      }, [{id: 'database-tree-node'}]);

    pgAdmin.Browser.tree.addChild(serverTreeNode, databaseTreeNode);
  });

  describe('SearchObjects', ()=>{
    let ctrlMount = ()=>{
      return mount(<Theme>
        <SearchObjects nodeData={nodeData}/>
      </Theme>);
    };
    print(ctrlMount);

    // Comment out the below jasmine test case due to
    // "ResizeObserver loop limit exceeded" error message.
    //
    //    it('search', (done)=>{
    //      let ctrl = ctrlMount();
    //      setTimeout(()=>{
    //        ctrl.update();
    //        ctrl.find('InputText').find('input').simulate('change', {
    //          target: {value: 'plp'},
    //        });
    //        ctrl.update();
    //        setTimeout(()=>{
    //          ctrl.find('button[data-test="search"]').simulate('click');
    //          expect(ctrl.find('PgReactDataGrid').length).toBe(1);
    //          done();
    //        }, 0);
    //      }, 0);
    //    });
    //
    //    it('search_on_enter', (done)=>{
    //      let ctrl = ctrlMount();
    //      setTimeout(()=>{
    //        ctrl.update();
    //        ctrl.find('InputText').find('input').simulate('change', {
    //          target: {value: 'plp'},
    //        });
    //        ctrl.update();
    //        setTimeout(()=>{
    //          ctrl.find('InputText').find('input').simulate('keypress', {
    //            key: 'Enter'
    //          });
    //          expect(ctrl.find('PgReactDataGrid').length).toBe(1);
    //          done();
    //        }, 0);
    //      }, 0);
    //    });
  });
});
