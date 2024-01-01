/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {Tree} from '../../../pgadmin/static/js/tree/tree';
import {ManageTreeNodes, TreeNode} from '../../../pgadmin/static/js/tree/tree_nodes';

export class TreeFake extends Tree {
  static build(structure, pgBrowser) {
    let tree = new TreeFake(pgBrowser);
    let rootNode = tree.rootNode;

    if (structure.children !== undefined) {
      structure.children.forEach((child) => {
        TreeFake.recursivelyAddNodes(tree, child, rootNode);
      });
    }

    return tree;
  }

  static recursivelyAddNodes(tree, newNode, parent) {
    let id = newNode.id;
    let data = newNode.data ? newNode.data : {};
    let domNode = newNode.domNode ? newNode.domNode : [{id: id}];

    let parentPath = tree.translateTreeNodeIdFromReactTree([parent]);

    tree.addNewNode(id, data, domNode, parentPath);

    if (newNode.children !== undefined) {
      newNode.children.forEach((child) => {
        TreeFake.recursivelyAddNodes(tree, child, newNode);
      });
    }
  }

  constructor(pgBrowser) {
    let manageTree = new ManageTreeNodes();
    let tree = {
      'unload': jest.fn(),
      'onTreeEvents': jest.fn(),
      'getActiveFile': jest.fn(),
      'setActiveFile': jest.fn(),
      'deSelectActiveFile': jest.fn(),
      'closeDirectory': jest.fn(),
    };
    tree.unload.mockImplementation(function(domNode, config) {
      config.success();
    });

    super(tree, manageTree, pgBrowser);
    this.treeToOurTreeTranslator = {};

  }

  addNewNode(id, data, domNode, path) {
    this.treeToOurTreeTranslator[id] = id;
    if (path !== null && path !== undefined) {
      if (typeof(path) === 'object') path = path.join('/');
      this.treeToOurTreeTranslator[id] = path != '' ? path + '/' + id : id;
      if (path.indexOf('/browser/') != 0) path = path != '' ? '/browser/' + path : undefined;
    }
    return super.addNewNode(id, data, domNode, path);
  }

  addChild(parent, child) {
    child.setParent(parent);
    this.treeToOurTreeTranslator[child.id] = this.treeToOurTreeTranslator[parent.id] + '/' + child.id;
    parent.children.push(child);
  }

  hasParent(treeNode) {
    let parents = this.translateTreeNodeIdFromReactTree(treeNode).split('/');
    return parents.length > 1;
  }

  parent(treeNode) {
    if (this.hasParent(treeNode)) {
      let path = this.translateTreeNodeIdFromReactTree(treeNode);
      return [{id: this.findNode('/browser/' + path).parent().id}];
    }

    return null;
  }

  translateTreeNodeIdFromReactTree(treeNode) {
    if (treeNode === undefined || treeNode[0] === undefined) {
      return null;
    }
    return this.treeToOurTreeTranslator[treeNode[0].id];
  }

  findNodeByDomElement(domElement) {
    const path = this.translateTreeNodeIdFromReactTree(domElement);

    if(!path || !path[0]) {
      return undefined;
    }

    return this.findNode('/browser/' + path);

  }

  getTreeNodeHierarchy(identifier) {
    let idx = 0;
    let node_cnt = 0;
    let result = {};
    let item = null;
    if (TreeNode.prototype.isPrototypeOf(identifier)) {
      item = identifier;
    } else {
      item = identifier.path ? this.findNode(identifier.path) : this.findNodeByDomElement(identifier);
    }

    if (item == undefined || item == null) return null;

    do {
      const currentNodeData = item.getData();
      if (currentNodeData._type in this.Nodes && this.Nodes[currentNodeData._type].hasId) {
        const nodeType = mapType(currentNodeData._type, node_cnt);
        if (result[nodeType] === undefined) {
          result[nodeType] = _.extend({}, currentNodeData, {
            'priority': idx,
          });
          idx -= 1;
        }
      }
      node_cnt += 1;
      item = item.hasParent() ? item.parent() : null;
    } while (item);

    return result;
  }

  itemData(treeNode) {
    let node = this.findNodeByDomElement(treeNode);
    if (node === undefined || node === null) {
      return undefined;
    }
    return node.getData();
  }

  selected() {
    return this.selectedNode;
  }

  selectNode(selectedNode) {
    this.selectedNode = selectedNode;
  }
}

function mapType(type, idx) {
  return (type === 'partition' && idx > 0) ? 'table' : type;
}
