/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
/////////////////////////////////////////////////////////////

import {
  isTreeItemOfChildOfSchema, childCreateMenuEnabled,
} from 'pgadmin.schema.dir/schema_child_tree_node';

import * as pgBrowser from 'pgbrowser/browser';
import {TreeFake} from '../../tree/tree_fake';

describe('#childCreateMenuEnabled', () => {
  let data;
  let tree;

  describe(' - when data is not null', () => {
    beforeEach(() => {
      data = {};
    });
    describe(' and check is false', () => {
      beforeEach(() => {
        data = {check: false};
      });
      it(', then it returns true', () => {
        expect(childCreateMenuEnabled({}, {}, data)).toBe(true);
      });
    });

    describe(' and check', () => {
      describe(' is true', () => {
        beforeEach(() => {
          data = {check: true};
        });

        describe(', on schema node', () => {
          beforeEach(() => {
            let hierarchy = {
              id: 'root',
              children: [{
                id: 'level2',
                data: {_type: 'schema'},
              }],
            };

            tree = TreeFake.build(hierarchy);
            pgBrowser.treeMenu = tree;
          });
          it(' it is true', () => {
            expect(childCreateMenuEnabled(
              {}, [{id: 'level2'}], data
            )).toBe(true);

          });
        });

        describe(', on child collection node under schema node ', () => {
          beforeEach(() => {
            let hierarchy = {
              id: 'root',
              children: [{
                id: 'level2',
                data: {_type: 'schema'},
                children: [{
                  id: 'coll-table',
                  data: {_type: 'coll-table'},
                }],
              }],
            };

            tree = TreeFake.build(hierarchy);
            pgBrowser.treeMenu = tree;
          });

          it(' it is true', () => {
            expect(childCreateMenuEnabled(
              {}, [{id: 'coll-table'}], data
            )).toBe(true);
          });
        });

        describe(', on one of the child node under schema node ', () => {
          beforeEach(() => {
            let hierarchy = {
              id: 'root',
              children: [{
                id: 'level2',
                data: {_type: 'schema'},
                children: [{
                  id: 'coll-table',
                  data: {_type: 'coll-table'},
                  children: [{
                    id: 'table/1',
                    data: {_type: 'table'},
                  }],
                }],
              }],
            };

            tree = TreeFake.build(hierarchy);
            pgBrowser.treeMenu = tree;
          });

          it(' it is true', () => {
            expect(childCreateMenuEnabled(
              {}, [{id: 'table/1'}], data
            )).toBe(true);
          });
        });

        describe(', on catalog node', () => {
          beforeEach(() => {
            let hierarchy = {
              id: 'root',
              children: [{
                id: 'level2',
                data: {_type: 'catalog'},
              }],
            };

            tree = TreeFake.build(hierarchy);
            pgBrowser.treeMenu = tree;
          });
          it(' it is false', () => {
            expect(
              childCreateMenuEnabled({}, [{id: 'level2'}], data)
            ).toBe(false);
          });
        });

        describe(', on child collection node under catalog node ', () => {
          beforeEach(() => {
            let hierarchy = {
              id: 'root',
              children: [{
                id: 'level2',
                data: {_type: 'catalog'},
                children: [{
                  id: 'coll-table',
                  data: {_type: 'coll-table'},
                }],
              }],
            };

            tree = TreeFake.build(hierarchy);
            pgBrowser.treeMenu = tree;
          });

          it(' it is false', () => {
            expect(childCreateMenuEnabled(
              {}, [{id: 'coll-table'}], data
            )).toBe(false);
          });
        });

        describe(', on one of the child node under catalog node ', () => {
          beforeEach(() => {
            let hierarchy = {
              id: 'root',
              children: [{
                id: 'level2',
                data: {_type: 'catalog'},
                children: [{
                  id: 'coll-table',
                  data: {_type: 'coll-table'},
                  children: [{
                    id: 'table/1',
                    data: {_type: 'table'},
                  }],
                }],
              }],
            };

            tree = TreeFake.build(hierarchy);
            pgBrowser.treeMenu = tree;
          });

          it(' it is false', () => {
            expect(childCreateMenuEnabled(
              {}, [{id: 'table/1'}], data
            )).toBe(false);
          });
        });
      });
    });
  });
});

describe('#childDropMenuEnabled', () => {
  let tree;

  describe(' - the child node under schema node ', () => {
    beforeEach(() => {
      let hierarchy = {
        id: 'root',
        children: [{
          id: 'level2',
          data: {_type: 'schema'},
          children: [{
            id: 'coll-table',
            data: {_type: 'coll-table'},
            children: [{
              id: 'table/1',
              data: {_type: 'table'},
            }],
          }],
        }],
      };

      tree = TreeFake.build(hierarchy);
      pgBrowser.treeMenu = tree;
    });

    it(' it is true', () => {
      expect(isTreeItemOfChildOfSchema(
        {}, [{id: 'table/1'}]
      )).toBe(true);
    });
  });

  describe('- the child node under the catalog node ', () => {
    beforeEach(() => {
      let hierarchy = {
        id: 'root',
        children: [{
          id: 'level2',
          data: {_type: 'catalog'},
          children: [{
            id: 'coll-table',
            data: {_type: 'coll-table'},
            children: [{
              id: 'table/1',
              data: {_type: 'table'},
            }],
          }],
        }],
      };

      tree = TreeFake.build(hierarchy);
      pgBrowser.treeMenu = tree;
    });

    it(' it is false', () => {
      expect(isTreeItemOfChildOfSchema(
        {}, [{id: 'table/1'}]
      )).toBe(false);
    });
  });
});
