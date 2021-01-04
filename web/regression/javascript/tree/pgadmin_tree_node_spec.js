//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import {
  getTreeNodeHierarchyFromElement,
  getTreeNodeHierarchyFromIdentifier,
} from '../../../pgadmin/static/js/tree/pgadmin_tree_node';
import {TreeNode} from '../../../pgadmin/static/js/tree/tree';
import {TreeFake} from './tree_fake';

const context = describe;

describe('tree#node#getTreeNodeHierarchy', () => {
  let browser;
  let newTree;
  beforeEach(() => {
    newTree = new TreeFake();
    browser = {
      Nodes: {
        'special one': {hasId: true},
        'child special': {hasId: true},
        'other type': {hasId: true},
        'table': {hasId: true},
        'partition': {hasId: true},
        'no id': {hasId: false},
      },
    };
    browser.treeMenu = newTree;
  });

  context('getTreeNodeHierarchy is called with aciTreeNode object', () => {
    describe('When the current node is root element', () => {
      beforeEach(() => {
        newTree.addNewNode('root', {
          'some key': 'some value',
          '_type': 'special one',
        });
      });

      it('returns a object with the element type passed data and priority == 0', () => {
        const result = getTreeNodeHierarchyFromIdentifier.bind(browser)([{id: 'root'}]);
        expect(result).toEqual({
          'special one': {
            'some key': 'some value',
            '_type': 'special one',
            'priority': 0,
          },
        });
      });
    });

    describe('When the current node is not of a known type', () => {
      beforeEach(() => {
        newTree.addNewNode('root', {
          'some key': 'some value',
          '_type': 'do not exist',
        }, []);
      });

      it('returns a empty object', () => {
        const result = getTreeNodeHierarchyFromIdentifier.bind(browser)('root');
        expect(result).toEqual({});
      });
    });

    describe('When the current node type has no id', () => {
      beforeEach(() => {
        newTree.addNewNode('root', {
          'some key': 'some value',
          '_type': 'no id',
        }, []);
      });

      it('returns a empty object', () => {
        const result = getTreeNodeHierarchyFromIdentifier.bind(browser)('root');
        expect(result).toEqual({});
      });
    });

    describe('When the current node is at the second level', () => {
      beforeEach(() => {
        const root = newTree.addNewNode('root', {
          'some key': 'some value',
          '_type': 'special one',
        });
        const firstChild = new TreeNode('first child', {
          'some key': 'some other value',
          '_type': 'child special',
        }, ['root']);
        newTree.addChild(root, firstChild);
      });

      it('returns a empty object', () => {
        const result = getTreeNodeHierarchyFromIdentifier.bind(browser)([{id: 'first child'}]);
        expect(result).toEqual({
          'child special': {
            'some key': 'some other value',
            '_type': 'child special',
            'priority': 0,
          },
          'special one': {
            'some key': 'some value',
            '_type': 'special one',
            'priority': -1,
          },
        });
      });
    });

    context('When tree as "special type"', () => {
      context('When "special type" have "other type"', () => {
        context('When "other type" have "special type"', () => {
          describe('When retrieving lead node', () => {
            it('does not override previous node type data', () => {
              const rootNode = newTree.addNewNode('root', {
                'some key': 'some value',
                '_type': 'special one',
              }, []);

              const level1 = new TreeNode('level 1', {
                'some key': 'some value',
                '_type': 'other type',
              });
              newTree.addChild(rootNode, level1);

              newTree.addChild(level1, new TreeNode('level 2', {
                'some key': 'expected value',
                '_type': 'special one',
                'some other key': 'some other value',
              }));

              const result = getTreeNodeHierarchyFromIdentifier.bind(browser)([{id: 'level 2'}]);
              expect(result).toEqual({
                'special one': {
                  'some key': 'expected value',
                  '_type': 'special one',
                  'some other key': 'some other value',
                  'priority': 0,
                },
                'other type': {
                  'some key': 'some value',
                  '_type': 'other type',
                  'priority': -1,
                },
              });
            });
          });
        });
      });
    });

    context('When tree has table', () => {
      context('when table has partition', () => {
        it('returns table with partition parameters', () => {
          const root = newTree.addNewNode('root', {
            'some key': 'some value',
            '_type': 'special one',
          }, []);
          const level1 = new TreeNode('level 1', {
            'some key': 'some value',
            '_type': 'table',
          });
          newTree.addChild(root, level1);
          newTree.addChild(level1, new TreeNode('level 2', {
            'some key': 'expected value',
            '_type': 'partition',
            'some other key': 'some other value',
          }));

          const result = getTreeNodeHierarchyFromIdentifier.bind(browser)([{id:'level 2'}]);
          expect(result).toEqual({
            'special one': {
              'some key': 'some value',
              '_type': 'special one',
              'priority': -2,
            },
            'table': {
              'some key': 'some value',
              '_type': 'table',
              'priority': -1,
            },
            'partition': {
              'some key': 'expected value',
              'some other key': 'some other value',
              '_type': 'partition',
              'priority': 0,
            },
          });
        });
      });
    });
  });

  context('getTreeNodeHierarchy is called with TreeNode object', () => {
    let treeNode;
    describe('When the current node is root element', () => {
      beforeEach(() => {
        treeNode = newTree.addNewNode('root', {
          'some key': 'some value',
          '_type': 'special one',
        }, []);
      });

      it('returns a object with the element type passed data and priority == 0', () => {
        const result = getTreeNodeHierarchyFromElement(browser, treeNode);
        expect(result).toEqual({
          'special one': {
            'some key': 'some value',
            '_type': 'special one',
            'priority': 0,
          },
        });
      });
    });

    describe('When the current node is not of a known type', () => {
      beforeEach(() => {
        treeNode = newTree.addNewNode('root', {
          'some key': 'some value',
          '_type': 'do not exist',
        }, []);
      });

      it('returns a empty object', () => {
        const result = getTreeNodeHierarchyFromElement(browser, treeNode);
        expect(result).toEqual({});
      });
    });

    describe('When the current node type has no id', () => {
      beforeEach(() => {
        treeNode = newTree.addNewNode('root', {
          'some key': 'some value',
          '_type': 'no id',
        }, []);
      });

      it('returns a empty object', () => {
        const result = getTreeNodeHierarchyFromElement(browser, treeNode);
        expect(result).toEqual({});
      });
    });

    describe('When the current node is at the second level', () => {
      beforeEach(() => {
        const root = newTree.addNewNode('root', {
          'some key': 'some value',
          '_type': 'special one',
        }, []);
        treeNode = new TreeNode('first child', {
          'some key': 'some other value',
          '_type': 'child special',
        });
        newTree.addChild(root, treeNode);
      });

      it('returns a empty object', () => {
        const result = getTreeNodeHierarchyFromElement(browser, treeNode);
        expect(result).toEqual({
          'child special': {
            'some key': 'some other value',
            '_type': 'child special',
            'priority': 0,
          },
          'special one': {
            'some key': 'some value',
            '_type': 'special one',
            'priority': -1,
          },
        });
      });
    });

    context('When tree as "special type"', () => {
      context('When "special type" have "other type"', () => {
        context('When "other type" have "special type"', () => {
          describe('When retrieving lead node', () => {
            it('does not override previous node type data', () => {
              const root = newTree.addNewNode('root', {
                'some key': 'some value',
                '_type': 'special one',
              }, []);
              const level1 = new TreeNode('level 1', {
                'some key': 'some value',
                '_type': 'other type',
              });
              newTree.addChild(root, level1);
              treeNode = new TreeNode('level 2', {
                'some key': 'expected value',
                '_type': 'special one',
                'some other key': 'some other value',
              });
              newTree.addChild(level1, treeNode);

              const result = getTreeNodeHierarchyFromElement(browser, treeNode);
              expect(result).toEqual({
                'special one': {
                  'some key': 'expected value',
                  '_type': 'special one',
                  'some other key': 'some other value',
                  'priority': 0,
                },
                'other type': {
                  'some key': 'some value',
                  '_type': 'other type',
                  'priority': -1,
                },
              });
            });
          });
        });
      });
    });

    context('When tree has table', () => {
      context('when table has partition', () => {
        it('returns table with partition parameters', () => {
          const root = newTree.addNewNode('root', {
            'some key': 'some value',
            '_type': 'special one',
          });
          const level1 = newTree.addNewNode('level 1', {
            'some key': 'some value',
            '_type': 'table',
          });
          newTree.addChild(root, level1);
          treeNode = new TreeNode('level 2', {
            'some key': 'expected value',
            '_type': 'partition',
            'some other key': 'some other value',
          });
          newTree.addChild(level1, treeNode);

          const result = getTreeNodeHierarchyFromElement(browser, treeNode);
          expect(result).toEqual({
            'special one': {
              'some key': 'some value',
              '_type': 'special one',
              'priority': -2,
            },
            'table': {
              'some key': 'some value',
              '_type': 'table',
              'priority': -1,
            },
            'partition': {
              'some key': 'expected value',
              'some other key': 'some other value',
              '_type': 'partition',
              'priority': 0,
            },
          });
        });
      });
    });
  });
});
