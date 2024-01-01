/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import {
  enableTriggers,
  disableTriggers,
} from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/enable_disable_triggers';
import pgAdmin from 'sources/pgadmin';
import {TreeFake} from '../tree/tree_fake';
import {TreeNode} from '../../../pgadmin/static/js/tree/tree_nodes';
import { waitFor } from '@testing-library/react';

let beforeEachResponseError = (networkMock)=> {
  networkMock.onPut(/.*/).reply(() => {
    return [500, {
      success: 0,
      errormsg: 'some error message',
    }];
  });
};

describe('#enableTriggers', () => {
  let networkMock;
  let tree;
  let generateUrlSpy;
  beforeEach(() => {
    networkMock = new MockAdapter(axios);
    tree = new TreeFake();

    jest.spyOn(tree, 'unload').mockImplementation(function() {
      return Promise.resolve('Success!');
    });

    const server1 = tree.addNewNode('server1', {_id: 1}, ['<li>server1</li>']);
    const database1 = tree.addNewNode('database1', {_type: 'database'}, ['<li>database1</li>']);
    tree.addChild(server1, database1);

    const schema1 = tree.addNewNode('schema1', {_type: 'schema'}, ['<li>schema1</li>']);
    tree.addChild(database1, schema1);

    const table1 = tree.addNewNode('table1', {_type: 'table'}, ['<li>table1</li>']);
    tree.addChild(schema1, table1);

    const column1 = tree.addNewNode('column1', {_type: 'column'}, ['<li>column1</li>']);
    tree.addChild(table1, column1);

    const tableNoData = tree.addNewNode('table-no-data', undefined, ['<li>table-no-data</li>']);
    tree.addChild(schema1, tableNoData);

    jest.spyOn(pgAdmin.Browser.notifier, 'success');
    jest.spyOn(pgAdmin.Browser.notifier, 'error');

    generateUrlSpy = jest.fn();
    generateUrlSpy.mockReturnValue('/some/place');
  });

  describe('no node is selected', () => {
    it('does not send the request to the backend', () => {
      networkMock.onAny('.*').reply(200, () => { /*This is intentional (SonarQube)*/
      });


      expect(enableTriggers(tree, generateUrlSpy, {})).toEqual(false);


    });
  });

  describe('a node is selected', () => {
    describe('node as no data', () => {
      it('does not send the request to the backend', () => {
        tree.selectNode([{id: 'table-no-data'}]);

        networkMock.onAny('.*').reply(200, () => {
          /*This is intentional (SonarQube)*/
        });


        expect(enableTriggers(tree, generateUrlSpy, {})).toEqual(false);


      });
    });

    describe('node as  data', () => {
      describe('backend responds with success', () => {
        let networkMockCalledWith;
        beforeEach(() => {
          networkMockCalledWith = false;
          networkMock.onPut(/.*/).reply((configuration) => {
            networkMockCalledWith = configuration;
            return [200, {
              success: 1,
              info: 'some information',
              data: {
                has_enable_triggers: '1'
              }
            }];
          });
        });

        it('displays an alert box with success', async () => {
          pgAdmin.Browser.notifier.success.mockClear();
          tree.selectNode([{id: 'table1'}]);
          enableTriggers(tree, generateUrlSpy, {});
          await waitFor(()=>{
            expect(pgAdmin.Browser.notifier.success).toHaveBeenCalledWith('some information');
          });
        });

        it('reloads the node', async () => {
          enableTriggers(tree, generateUrlSpy, {item: [{id: 'table1'}]});
          await waitFor(()=>{
            expect(tree.selected()).toEqual(['<li>table1</li>']);
          });
        });

        it('call backend with the correct parameters', async () => {
          enableTriggers(tree, generateUrlSpy, {item: [{id: 'table1'}]});
          await waitFor(()=>{
            expect(networkMockCalledWith.data).toEqual(JSON.stringify({is_enable_trigger: 'O'}));
          });
        });
      });

      describe('backend responds with error', () => {
        beforeEach(() => {
          beforeEachResponseError(networkMock);
        });

        it('displays an error alert', async () => {
          pgAdmin.Browser.notifier.error.mockClear();
          tree.selectNode([{id: 'table1'}]);
          enableTriggers(tree, generateUrlSpy, {});
          await waitFor(()=>{
            expect(pgAdmin.Browser.notifier.error).toHaveBeenCalledWith('some error message');
          });
        });

        it('unload the node', async () => {
          enableTriggers(tree, generateUrlSpy, {item: [{id: 'table1'}]});
          await waitFor(()=>{
            expect(tree.findNodeByDomElement([{id: 'table1'}]).children.length).toEqual(0);
          });
        });
      });
    });
  });
});

describe('#disableTriggers', () => {
  let networkMock;
  let tree;
  let generateUrlSpy;
  beforeEach(() => {
    networkMock = new MockAdapter(axios);
    tree = new TreeFake();
    const server1 = tree.addNewNode('server1', {_id: 1}, ['<li>server1</li>']);
    const database1 = new TreeNode('database1', {_type: 'database'}, ['<li>database1</li>']);
    tree.addChild(server1, database1);

    const schema1 = new TreeNode('schema1', {_type: 'schema'}, ['<li>schema1</li>']);
    tree.addChild(database1, schema1);

    const table1 = new TreeNode('table1', {_type: 'table'}, ['<li>table1</li>']);
    tree.addChild(schema1, table1);

    const column1 = new TreeNode('column1', {_type: 'column'}, ['<li>column1</li>']);
    tree.addChild(table1, column1);

    const tableNoData = new TreeNode('table-no-data', undefined, ['<li>table-no-data</li>']);
    tree.addChild(schema1, tableNoData);

    generateUrlSpy = jest.fn();
    generateUrlSpy.mockReturnValue('/some/place');
    jest.spyOn(tree, 'unload').mockImplementation(function() {
      return Promise.resolve('Success!');
    });

  });

  describe('no node is selected', () => {
    it('does not send the request to the backend', async () => {
      networkMock.onAny('.*').reply(200, () => {
        /*This is intentional (SonarQube)*/
      });
      await waitFor(()=>{
        expect(disableTriggers(tree, generateUrlSpy, {})).toEqual(false);
      });
    });
  });

  describe('a node is selected', () => {
    describe('node as no data', () => {
      it('does not send the request to the backend', async () => {
        tree.selectNode([{id: 'table-no-data'}]);

        networkMock.onAny('.*').reply(200, () => {
          /*This is intentional (SonarQube)*/
        });

        await waitFor(()=>{
          expect(disableTriggers(tree, generateUrlSpy, {})).toEqual(false);
        });
      });
    });

    describe('node as  data', () => {
      describe('backend responds with success', () => {
        let networkMockCalledWith;
        beforeEach(() => {
          networkMockCalledWith = false;
          networkMock.onPut(/.*/).reply((configuration) => {
            networkMockCalledWith = configuration;
            return [200, {
              success: 1,
              info: 'some information',
              data: {
                has_enable_triggers: '0'
              }
            }];
          });
        });

        it('displays an alert box with success', async () => {
          pgAdmin.Browser.notifier.success.mockClear();
          tree.selectNode([{id: 'table1'}]);
          disableTriggers(tree, generateUrlSpy, {});
          await waitFor(()=>{
            expect(pgAdmin.Browser.notifier.success).toHaveBeenCalledWith('some information');
          });
        });

        it('reloads the node', async () => {
          disableTriggers(tree, generateUrlSpy, {item: [{id: 'table1'}]});
          await waitFor(()=>{
            expect(tree.selected()).toEqual(['<li>table1</li>']);
          });
        });

        it('call backend with the correct parameters', async () => {
          disableTriggers(tree, generateUrlSpy, {item: [{id: 'table1'}]});
          await waitFor(()=>{
            expect(networkMockCalledWith.data).toEqual(JSON.stringify({is_enable_trigger: 'D'}));
          });
        });
      });

      describe('backend responds with error', () => {
        beforeEach(() => {
          beforeEachResponseError(networkMock);
        });

        it('displays an error alert', async () => {
          pgAdmin.Browser.notifier.error.mockClear();
          tree.selectNode([{id: 'table1'}]);
          disableTriggers(tree, generateUrlSpy, {});
          await waitFor(()=>{
            expect(pgAdmin.Browser.notifier.error).toHaveBeenCalledWith('some error message');
          });
        });

        it('unload the node', async () => {
          disableTriggers(tree, generateUrlSpy, {item: [{id: 'table1'}]});
          await waitFor(()=>{
            expect(tree.findNodeByDomElement([{id: 'table1'}]).children.length).toEqual(0);
          });
        });
      });
    });
  });
});
