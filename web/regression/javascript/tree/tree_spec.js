//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import {Tree, TreeNode} from '../../../pgadmin/static/js/tree/tree';
import {TreeFake} from './tree_fake';

const context = describe;

const treeTests = (treeClass, setDefaultCallBack) => {
  let tree;
  beforeEach(() => {
    tree = new treeClass();
  });

  describe('#addNewNode', () => {
    describe('when add a new root element', () => {
      context('using [] as the parent', () => {
        beforeEach(() => {
          tree.addNewNode('some new node', {data: 'interesting'}, undefined, []);
        });

        it('can be retrieved', () => {
          const node = tree.findNode(['some new node']);
          expect(node.data).toEqual({data: 'interesting'});
        });

        it('return false for #hasParent()', () => {
          const node = tree.findNode(['some new node']);
          expect(node.hasParent()).toEqual(false);
        });

        it('return null for #parent()', () => {
          const node = tree.findNode(['some new node']);
          expect(node.parent()).toBeNull();
        });
      });

      context('using null as the parent', () => {
        beforeEach(() => {
          tree.addNewNode('some new node', {data: 'interesting'}, undefined, null);
        });

        it('can be retrieved', () => {
          const node = tree.findNode(['some new node']);
          expect(node.data).toEqual({data: 'interesting'});
        });

        it('return false for #hasParent()', () => {
          const node = tree.findNode(['some new node']);
          expect(node.hasParent()).toEqual(false);
        });

        it('return null for #parent()', () => {
          const node = tree.findNode(['some new node']);
          expect(node.parent()).toBeNull();
        });
      });

      context('using undefined as the parent', () => {
        beforeEach(() => {
          tree.addNewNode('some new node', {data: 'interesting'});
        });

        it('can be retrieved', () => {
          const node = tree.findNode(['some new node']);
          expect(node.data).toEqual({data: 'interesting'});
        });

        it('return false for #hasParent()', () => {
          const node = tree.findNode(['some new node']);
          expect(node.hasParent()).toEqual(false);
        });

        it('return null for #parent()', () => {
          const node = tree.findNode(['some new node']);
          expect(node.parent()).toBeNull();
        });
      });
    });

    describe('when add a new element as a child', () => {
      let parentNode;
      beforeEach(() => {
        parentNode = tree.addNewNode('parent node', {data: 'parent data'}, undefined, []);
        tree.addNewNode('some new node', {data: 'interesting'}, undefined, ['parent' +
        ' node']);
      });

      it('can be retrieved', () => {
        const node = tree.findNode(['parent node', 'some new node']);
        expect(node.data).toEqual({data: 'interesting'});
      });

      it('return true for #hasParent()', () => {
        const node = tree.findNode(['parent node', 'some new node']);
        expect(node.hasParent()).toEqual(true);
      });

      it('return "parent node" object for #parent()', () => {
        const node = tree.findNode(['parent node', 'some new node']);
        expect(node.parent()).toEqual(parentNode);
      });
    });

    describe('when add an element that already exists under a parent', () => {
      beforeEach(() => {
        tree.addNewNode('parent node', {data: 'parent data'}, undefined, []);
        tree.addNewNode('some new node', {data: 'interesting'}, undefined, ['parent' +
        ' node']);
      });

      it('does not add a new child', () => {
        tree.addNewNode('some new node', {data: 'interesting 1'}, undefined, ['parent' +
        ' node']);
        const parentNode = tree.findNode(['parent node']);
        expect(parentNode.children.length).toEqual(1);
      });

      it('updates the existing node data', () => {
        tree.addNewNode('some new node', {data: 'interesting 1'}, undefined, ['parent' +
        ' node']);
        const node = tree.findNode(['parent node', 'some new node']);
        expect(node.data).toEqual({data: 'interesting 1'});
      });
    });
  });

  describe('#translateTreeNodeIdFromACITree', () => {
    let aciTreeApi;
    beforeEach(() => {
      aciTreeApi = jasmine.createSpyObj('ACITreeApi', [
        'hasParent',
        'parent',
        'getId',
      ]);

      aciTreeApi.getId.and.callFake((node) => {
        return node[0].id;
      });
      tree.aciTreeApi = aciTreeApi;
    });

    describe('When tree as a single level', () => {
      beforeEach(() => {
        aciTreeApi.hasParent.and.returnValue(false);
      });

      it('returns an array with the ID of the first level', () => {
        let node = [{
          id: 'some id',
        }];
        tree.addNewNode('some id', {}, undefined, []);

        expect(tree.translateTreeNodeIdFromACITree(node)).toEqual(['some id']);
      });
    });

    describe('When tree as a 2 levels', () => {
      describe('When we try to retrieve the node in the second level', () => {
        it('returns an array with the ID of the first level and second level', () => {
          aciTreeApi.hasParent.and.returnValues(true, false);
          aciTreeApi.parent.and.returnValue([{
            id: 'parent id',
          }]);
          let node = [{
            id: 'some id',
          }];

          tree.addNewNode('parent id', {}, undefined, []);
          tree.addNewNode('some id', {}, undefined, ['parent id']);

          expect(tree.translateTreeNodeIdFromACITree(node))
            .toEqual(['parent id', 'some id']);
        });
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
        let aciTreeApi = jasmine.createSpyObj('ACITreeApi', [
          'hasParent',
          'parent',
          'getId',
        ]);

        aciTreeApi.getId.and.callFake((node) => {
          return node[0].id;
        });
        tree.aciTreeApi = aciTreeApi;
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
        tree.addNewNode('level1', {data: 'interesting'}, [{id: 'level1'}], []);
        level2 = tree.addNewNode('level2', {data: 'data'}, [{id: 'level2'}], ['level1']);
        tree.addNewNode('level3', {data: 'more data'}, [{id: 'level3'}], ['level1', 'level2']);

        tree.aciTreeApi = jasmine.createSpyObj(
          'ACITreeApi', ['setInode', 'unload', 'deselect', 'select']);
        tree.aciTreeApi.unload.and.callFake((domNode, config) => {
          config.success();
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

      describe('ACITree specific', () => {
        it('sets the current node as a Inode, changing the Icon back to +', (done) => {
          level2.reload(tree)
            .then(()=>{
              expect(tree.aciTreeApi.setInode).toHaveBeenCalledWith([{id: 'level2'}]);
              done();
            })
            .catch((error)=>{
              fail(error);
            });
        });

        it('deselect the node and selects it again to trigger ACI tree' +
          ' events', (done) => {
          level2.reload(tree)
            .then(()=>{
              setTimeout(() => {
                expect(tree.aciTreeApi.deselect).toHaveBeenCalledWith([{id: 'level2'}]);
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
        tree.addNewNode('level1', {data: 'interesting'}, ['<li>level1</li>'], []);
        level2 = tree.addNewNode('level2', {data: 'data'}, ['<li>level2</li>'], ['level1']);
        tree.addNewNode('level3', {data: 'more data'}, ['<li>level3</li>'], ['level1', 'level2']);
        tree.aciTreeApi = jasmine.createSpyObj('ACITreeApi', ['unload']);
        tree.aciTreeApi.unload.and.callFake((domNode, config) => {
          config.success();
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

      it('calls unload on the ACI Tree', (done) => {
        level2.unload(tree)
          .then(()=>{
            expect(tree.aciTreeApi.unload).toHaveBeenCalledWith(['<li>level2</li>'], jasmine.any(Object));
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
      let aciTreeApi = jasmine.createSpyObj('ACITreeApi', [
        'selected',
      ]);
      tree.aciTreeApi = aciTreeApi;
      aciTreeApi.selected.and.returnValue(selectedNode);
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
          tree.addNewNode('level1', {data: 'interesting'}, undefined, []);
          tree.addNewNode('level2', {data: 'interesting'}, undefined, ['level1']);
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
        tree.addNewNode('level1', {data: 'interesting'}, undefined, []);
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

    describe('#itemData', () => {
      let tree;
      beforeEach(() => {
        tree = new TreeFake();
        tree.addNewNode('level1', {data: 'interesting'}, undefined, []);
        tree.addNewNode('level2', {data: 'expected data'}, undefined, ['level1']);
      });

      context('retrieve data from the node', () => {
        it('return the node data', () => {
          expect(tree.itemData([{id: 'level2'}])).toEqual({
            data: 'expected' +
            ' data',
          });
        });
      });

      context('retrieve data from node not found', () => {
        it('return undefined', () => {
          expect(tree.itemData([{id: 'bamm'}])).toBeUndefined();
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
        expect(child.path).toEqual('root.node.1');
      });
    });
  });
});
