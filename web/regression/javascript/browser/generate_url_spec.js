/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {generate_url} from 'sources/browser/generate_url';

describe('generate_url', () => {
  describe('in collection', () => {
    let baseUrl, treeInfo, actionType, nodeType, pickFunction;
    beforeEach(() => {
      baseUrl = 'https://base/and-extension/';
      treeInfo = {
        treeNode1: {
          _id: 'an_id',
          priority: 1000,
        },
      };
      actionType = 'actionType';
      nodeType = 'nodeType';
      pickFunction = () => {
        return true;
      };
    });
    it('returns a correctly formatted URL', () => {
      let formattedUrl = generate_url(baseUrl, treeInfo, actionType, nodeType, pickFunction);

      expect(formattedUrl).toEqual('https://base/and-extension/nodeType/actionType/an_id/');
    });

    describe('given there are multiple treeInfoItems', () => {
      beforeEach(() => {
        treeInfo['treeNode2'] = {
          _id: 'another_id',
          priority: 500,
        };
        treeInfo['treeNode3'] = {
          _id: 'a_third_id',
          priority: 100,
        };

        pickFunction = (value, key) => {
          return key != 'treeNode2';
        };
      });

      it('chooses the correct treeInfo', () => {
        let formattedUrl = generate_url(baseUrl, treeInfo, actionType, nodeType, pickFunction);

        expect(formattedUrl).toEqual('https://base/and-extension/nodeType/actionType/a_third_id/an_id/');
      });
    });
  });
  describe('in node', () => {
    let baseUrl, treeInfo, actionType, nodeType, pickFunction, itemDataID;
    beforeEach(() => {
      baseUrl = 'https://base/and-extension/';
      treeInfo = {
        treeNode1: {
          _id: 'an_id',
          priority: 1000,
        },
      };
      actionType = 'actionType';
      nodeType = 'nodeType';
      pickFunction = () => {
        return true;
      };
      itemDataID = 'item1';
    });
    it('returns a correctly formatted URL', () => {
      let formattedUrl = generate_url(baseUrl, treeInfo, actionType, nodeType, pickFunction, itemDataID);

      expect(formattedUrl).toEqual('https://base/and-extension/nodeType/actionType/an_id/item1');
    });

    describe('given there are multiple treeInfoItems', () => {
      beforeEach(() => {
        treeInfo['treeNode2'] = {
          _id: 'another_id',
          priority: 500,
        };
        treeInfo['treeNode3'] = {
          _id: 'a_third_id',
          priority: 100,
        };

        pickFunction = (value) => {
          return value.priority > 100;
        };
      });

      it('chooses the correct treeInfo', () => {
        let formattedUrl = generate_url(baseUrl, treeInfo, actionType, nodeType, pickFunction, itemDataID);

        expect(formattedUrl).toEqual('https://base/and-extension/nodeType/actionType/another_id/an_id/item1');
      });
    });
  });
});
