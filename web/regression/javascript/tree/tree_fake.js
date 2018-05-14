/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {Tree} from '../../../pgadmin/static/js/tree/tree';

export class TreeFake extends Tree {
  constructor() {
    super();
    this.aciTreeToOurTreeTranslator = {};
    this.aciTreeApi = jasmine.createSpyObj(
      ['ACITreeApi'], ['setInode', 'unload', 'deselect', 'select']);
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
    if(aciTreeNode === undefined || aciTreeNode[0] === undefined) {
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
