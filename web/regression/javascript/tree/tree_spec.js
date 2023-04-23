//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4  PostgreSQL Tools
//
// Copyright (C) 2013  2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import {Tree} from '../../../pgadmin/static/js/tree/tree';
import {TreeNode, ManageTreeNodes} from '../../../pgadmin/static/js/tree/tree_nodes';
import {TreeFake} from './tree_fake';

const context = describe;

const treeTests = (treeClass, setDefaultCallBack) => {
  let tree;
  beforeEach(() => {
    let manageTree = new ManageTreeNodes();
    let reactTree = jasmine.createSpyObj(
      'tree', ['onTreeEvents', 'getActiveFile']);
    tree = new treeClass(reactTree, manageTree);
  });

  describe('#addNewNode', () => {
    beforeEach(() => {
      tree.rootNode = new TreeNode(undefined, {});
    });
    describe('when add a new root element', () => {
      context('using undefined as the parent', () => {
        beforeEach(() => {
          tree.addNewNode('some new node', {data: 'interesting'}, undefined, undefined);
        });

        it('can be retrieved', () => {
          const node = tree.findNode('/browser/some new node');
          expect(node.data).toEqual({data: 'interesting'});
        });

        it('return false for #hasParent()', () => {
          const node = tree.findNode('/browser/some new node');
          expect(node.hasParent()).toEqual(false);
        });

        it('return null for #parent()', () => {
          const node = tree.findNode('/browser/some new node');
          expect(node.parent()).toBeNull();
        });
      });

      context('using null as the parent', () => {
        beforeEach(() => {
          tree.addNewNode('some new node', {data: 'interesting'}, undefined, null);
        });

        it('can be retrieved', () => {
          const node = tree.findNode('/browser/some new node');
          expect(node.data).toEqual({data: 'interesting'});
        });

        it('return false for #hasParent()', () => {
          const node = tree.findNode('/browser/some new node');
          expect(node.hasParent()).toEqual(false);
        });

        it('return null for #parent()', () => {
          const node = tree.findNode('/browser/some new node');
          expect(node.parent()).toBeNull();
        });
      });
    });

    describe('when add a new element as a child', () => {
      let parentNode;
      beforeEach(() => {
        parentNode = tree.addNewNode('parent node', {data: 'parent data'}, undefined, undefined);
        tree.addNewNode('some new node', {data: 'interesting'}, undefined, '/browser/parent node');
      });

      it('can be retrieved', () => {
        const node = tree.findNode('/browser/parent node/some new node');
        expect(node.data).toEqual({data: 'interesting'});
      });

      it('return true for #hasParent()', () => {
        const node = tree.findNode('/browser/parent node/some new node');
        expect(node.hasParent()).toEqual(true);
      });

      it('return "parent node" object for #parent()', () => {
        const node = tree.findNode('/browser/parent node/some new node');
        expect(node.parent()).toEqual(parentNode);
      });
    });

    describe('when add an element that already exists under a parent', () => {
      beforeEach(() => {
        tree.addNewNode('parent node', {data: 'parent data'}, undefined, undefined);
        tree.addNewNode('some new node', {data: 'interesting'}, undefined, '/browser/parent node');
      });

      it('does not add a new child', () => {
        tree.addNewNode('some new node', {data: 'interesting 1'}, undefined, '/browser/parent node');
        const parentNode = tree.findNode('/browser/parent node');
        expect(parentNode.children.length).toEqual(1);
      });

      it('updates the existing node data', () => {
        tree.addNewNode('some new node', {data: 'interesting 1'}, undefined, '/browser/parent node');
        const node = tree.findNode('/browser/parent node/some new node');
        expect(node.data).toEqual({data: 'interesting 1'});
      });
    });
  });

  describe('#selected', () => {
    context('a node in the tree is selected', () => {
      it('returns that node object', () => {
        let selectedNode = new TreeNode('bamm', {}, []);
        setDefaultCallBack(tree, selectedNode);
        expect(tree.selected()).toEqual(selectedNode);
      });
    });
  });

  describe('#findNodeByTreeElement', () => {
    context('retrieve data from node not found', () => {
      it('return undefined', () => {
        let reactTree = jasmine.createSpyObj('tree', [
          'hasParent',
          'parent',
          'getId',
          'onTreeEvents',
        ]);

        reactTree.getId.and.callFake((node) => {
          return node[0].id;
        });
        tree.tree = reactTree;
        expect(tree.findNodeByDomElement(['<li>something</li>'])).toBeUndefined();
      });
    });
  });
};

describe('tree tests', () => {
  describe('TreeNode', () => {
    describe('#hasParent', () => {
      context('parent is null', () => {
        it('returns false', () => {
          let treeNode = new TreeNode('123', {}, [], null);
          expect(treeNode.hasParent()).toEqual(false);
        });
      });
      context('parent is undefined', () => {
        it('returns false', () => {
          let treeNode = new TreeNode('123', {}, [], undefined);
          expect(treeNode.hasParent()).toEqual(false);
        });
      });
      context('parent exists', () => {
        it('returns true', () => {
          let parentNode = new TreeNode('456', {}, []);
          let treeNode = new TreeNode('123', {}, [], parentNode);
          expect(treeNode.hasParent()).toEqual(true);
        });
      });
    });

    describe('#reload', () => {
      let tree;
      let level2;
      beforeEach(() => {
        tree = new TreeFake();
        tree.addNewNode('level1', {data: 'interesting'}, [{id: 'level1'}], undefined);
        level2 = tree.addNewNode('level2', {data: 'data'}, [{id: 'level2'}], ['level1']);
        tree.addNewNode('level3', {data: 'more data'}, [{id: 'level3'}], ['level1', 'level2']);

        tree.tree = jasmine.createSpyObj(
          'tree', ['unload', 'onTreeEvents',
            'setActiveFile', 'closeDirectory', 'getActiveFile',
            'deSelectActiveFile']);
        tree.tree.unload.and.callFake(function() {
          return Promise.resolve('Success!');
        });
      });

      it('reloads the node and its children', (done) => {
        level2.reload(tree)
          .then(()=>{
            expect(tree.findNodeByDomElement([{id: 'level2'}])).toEqual(level2);
            done();
          })
          .catch((error)=>{
            fail(error);
          });
      });

      it('does not reload the children of node', (done) => {
        level2.reload(tree)
          .then(()=>{
            expect(tree.findNodeByDomElement([{id: 'level3'}])).toBeNull();
            done();
          })
          .catch((error)=>{
            fail(error);
          });
      });

      it('select the node', (done) => {
        level2.reload(tree)
          .then(()=>{
            setTimeout(() => {
              expect(tree.selected()).toEqual([{id: 'level2'}]);
              done();
            }, 20);
          })
          .catch((error)=>{
            fail(error);
          });
      });

      describe('ReactTree specific', () => {
        it('sets the current node as a Inode, changing the Icon back to +', (done) => {
          level2.reload(tree)
            .then(()=>{
              expect(tree.tree.closeDirectory).toHaveBeenCalledWith([{id: 'level2'}]);
              done();
            })
            .catch((error)=>{
              fail(error);
            });
        });

        it('deselect the node and selects it again to trigger React tree' +
              ' events', (done) => {
          level2.reload(tree)
            .then(()=>{
              setTimeout(() => {
                expect(tree.tree.deSelectActiveFile).toHaveBeenCalledWith([{id: 'level2'}]);
                done();
              }, 20);
            })
            .catch((error)=>{
              fail(error);
            });
        });
      });
    });

    describe('#unload', () => {
      let tree;
      let level2;
      beforeEach(() => {
        tree = new TreeFake();
        tree.addNewNode('level1', {data: 'interesting'}, ['<li>level1</li>'], undefined);
        level2 = tree.addNewNode('level2', {data: 'data'}, ['<li>level2</li>'], ['level1']);
        tree.addNewNode('level3', {data: 'more data'}, ['<li>level3</li>'], ['level1','level2']);
        tree.tree = jasmine.createSpyObj('tree', ['unload']);
        tree.tree.unload.and.callFake(() => {
          return Promise.resolve('Success!');
        });
      });

      it('unloads the children of the current node', (done) => {
        level2.unload(tree)
          .then(()=>{
            expect(tree.findNodeByDomElement([{id: 'level2'}])).toEqual(level2);
            expect(tree.findNodeByDomElement([{id: 'level3'}])).toBeNull();
            done();
          })
          .catch((error)=>{
            fail(error);
          });
      });

      it('calls unload on the React Tree', (done) => {
        level2.unload(tree)
          .then(()=>{
            expect(tree.tree.unload).toHaveBeenCalledWith(['<li>level2</li>']);
            done();
          })
          .catch((error)=>{
            fail(error);
          });
      });
    });
  });

  describe('Tree', () => {
    function realTreeSelectNode(tree, selectedNode) {
      let reactTree = jasmine.createSpyObj('tree', [
        'getActiveFile',
      ]);
      tree.tree = reactTree;
      reactTree.getActiveFile.and.returnValue(selectedNode);
    }

    treeTests(Tree, realTreeSelectNode);
  });

  describe('TreeFake', () => {
    function fakeTreeSelectNode(tree, selectedNode) {
      tree.selectNode(selectedNode);
    }

    treeTests(TreeFake, fakeTreeSelectNode);

    describe('#hasParent', () => {
      context('tree contains multiple levels', () => {
        let tree;
        beforeEach(() => {
          tree = new TreeFake();
          tree.addNewNode('level1', {data: 'interesting'}, undefined, undefined);
          tree.addNewNode('level2', {data: 'interesting'}, undefined, '/browser/level1');
        });

        context('node is at the first level', () => {
          it('returns false', () => {
            expect(tree.hasParent([{id: 'level1'}])).toEqual(false);
          });
        });

        context('node is at the second level', () => {
          it('returns true', () => {
            expect(tree.hasParent([{id: 'level2'}])).toEqual(true);
          });
        });
      });
    });

    describe('#parent', () => {
      let tree;
      beforeEach(() => {
        tree = new TreeFake();
        tree.addNewNode('level1', {data: 'interesting'}, undefined, undefined);
        tree.addNewNode('level2', {data: 'interesting'}, undefined, ['level1']);
      });

      context('node is the root', () => {
        it('returns null', () => {
          expect(tree.parent([{id: 'level1'}])).toBeNull();
        });
      });

      context('node is not root', () => {
        it('returns root element', () => {
          expect(tree.parent([{id: 'level2'}])).toEqual([{id: 'level1'}]);
        });
      });
    });

    describe('#addChild', () => {
      let root, child;
      beforeEach(() => {
        let tree = new TreeFake();
        root = tree.addNewNode('root', {}, [{id: 'root'}]);
        child = new TreeNode('node.1', {}, [{id: 'node.1'}]);
        tree.addChild(root, child);
      });

      it('adds a new child to a node', () => {
        expect(root.children).toEqual([child]);
      });

      it('changes the parent of the child node', () => {
        expect(root.children[0].parentNode).toEqual(root);
        expect(child.parentNode).toEqual(root);
      });

      it('changes the path of the child', () => {
        expect(child.path).toEqual('/browser/root/node.1');
      });
    });
  });
});
