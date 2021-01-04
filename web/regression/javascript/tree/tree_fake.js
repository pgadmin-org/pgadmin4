/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {Tree} from '../../../pgadmin/static/js/tree/tree';

export class TreeFake extends Tree {
  static build(structure) {
    let tree = new TreeFake();
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
    tree.addNewNode(id, data, domNode, tree.translateTreeNodeIdFromACITree([parent]));

    if (newNode.children !== undefined) {
      newNode.children.forEach((child) => {
        TreeFake.recursivelyAddNodes(tree, child, newNode);
      });
    }
  }

  constructor() {
    super();
    this.aciTreeToOurTreeTranslator = {};
    this.aciTreeApi = jasmine.createSpyObj(
      'ACITreeApi', ['setInode', 'unload', 'deselect', 'select']);
    this.aciTreeApi.unload.and.callFake(function(domNode, config) {
      config.success();
    });
  }

  addNewNode(id, data, domNode, path) {
    this.aciTreeToOurTreeTranslator[id] = [id];
    if (path !== null && path !== undefined) {
      this.aciTreeToOurTreeTranslator[id] = path.concat(id);
    }
    return super.addNewNode(id, data, domNode, path);
  }

  addChild(parent, child) {
    child.setParent(parent);
    this.aciTreeToOurTreeTranslator[child.id] = this.aciTreeToOurTreeTranslator[parent.id].concat(child.id);
    parent.children.push(child);
  }

  hasParent(aciTreeNode) {
    return this.translateTreeNodeIdFromACITree(aciTreeNode).length > 1;
  }

  parent(aciTreeNode) {
    if (this.hasParent(aciTreeNode)) {
      let path = this.translateTreeNodeIdFromACITree(aciTreeNode);
      return [{id: this.findNode(path).parent().id}];
    }

    return null;
  }

  translateTreeNodeIdFromACITree(aciTreeNode) {
    if (aciTreeNode === undefined || aciTreeNode[0] === undefined) {
      return null;
    }
    return this.aciTreeToOurTreeTranslator[aciTreeNode[0].id];
  }

  itemData(aciTreeNode) {
    let node = this.findNodeByDomElement(aciTreeNode);
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
