/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import * as BrowserFS from 'browserfs';
import pgAdmin from 'sources/pgadmin';
import _ from 'lodash';
import { FileType } from 'react-aspen';
import { findInTree } from './tree';

export class ManagePreferenceTreeNodes {
  constructor(data) {
    this.tree = {};
    this.tempTree = new TreeNode(undefined, {});
    this.treeData = data || [];
  }

  public init = (_root: string) => new Promise((res) => {
    const node = { parent: null, children: [], data: null };
    this.tree = {};
    this.tree[_root] = { name: 'root', type: FileType.Directory, metadata: node };
    res();
  });

  public updateNode = (_path, _data) => new Promise((res) => {
    const item = this.findNode(_path);
    if (item) {
      item.name = _data.label;
      item.metadata.data = _data;
    }
    res(true);
  });

  public removeNode = async (_path) => {
    const item = this.findNode(_path);

    if (item && item.parentNode) {
      item.children = [];
      item.parentNode.children.splice(item.parentNode.children.indexOf(item), 1);
    }
    return true;
  };

  findNode(path) {
    if (path === null || path === undefined || path.length === 0 || path == '/preferences') {
      return this.tempTree;
    }

    return findInTree(this.tempTree, path);
  }

  public addNode = (_parent: string, _path: string, _data: []) => new Promise((res) => {
    _data.type = _data.inode ? FileType.Directory : FileType.File;
    _data._label = _data.label;
    _data.label = _.escape(_data.label);

    _data.is_collection = isCollectionNode(_data._type);
    const nodeData = { parent: _parent, children: _data?.children ? _data.children : [], data: _data };

    const tmpParentNode = this.findNode(_parent);
    const treeNode = new TreeNode(_data.id, _data, {}, tmpParentNode, nodeData, _data.type);

    if (tmpParentNode !== null && tmpParentNode !== undefined) tmpParentNode.children.push(treeNode);

    res(treeNode);
  });

  public readNode = (_path: string) => new Promise<string[]>((res, rej) => {
    const temp_tree_path = _path,
      node = this.findNode(_path);
    node.children = [];

    if (node && node.children.length > 0) {
      if (!node.type === FileType.File) {
        rej('It\'s a leaf node');
      }
      else {
        if (node?.children.length != 0) res(node.children);
      }
    }

    const self = this;

    async function loadData() {
      const Path = BrowserFS.BFSRequire('path');
      const fill = async (tree) => {
        for (const idx in tree) {
          const _node = tree[idx];
          const _pathl = Path.join(_path, _node.id);
          await self.addNode(temp_tree_path, _pathl, _node);
        }
      };

      if (node && !_.isUndefined(node.id)) {
        const _data = self.treeData.find((el) => el.id == node.id);
        const subNodes = [];

        _data.childrenNodes.forEach(element => {
          subNodes.push(element);
        });

        await fill(subNodes);
      } else {
        await fill(self.treeData);
      }

      self.returnChildrens(node, res);
    }
    loadData();
  });

  public returnChildrens = (node: any, res: any)  =>{
    if (node?.children.length > 0) return res(node.children);
    else return res(null);
  };
}



export class TreeNode {
  constructor(id, data, domNode, parent, metadata, type) {
    this.id = id;
    this.data = data;
    this.setParent(parent);
    this.children = [];
    this.domNode = domNode;
    this.metadata = metadata;
    this.name = metadata ? metadata.data.label : '';
    this.type = type ? type : undefined;
  }

  hasParent() {
    return this.parentNode !== null && this.parentNode !== undefined;
  }

  parent() {
    return this.parentNode;
  }

  setParent(parent) {
    this.parentNode = parent;
    this.path = this.id;
    if (this.id)
      if (parent !== null && parent !== undefined && parent.path !== undefined) {
        this.path = parent.path + '/' + this.id;
      } else {
        this.path = '/preferences/' + this.id;
      }
  }

  getData() {
    if (this.data === undefined) {
      return undefined;
    } else if (this.data === null) {
      return null;
    }
    return Object.assign({}, this.data);
  }

  getHtmlIdentifier() {
    return this.domNode;
  }

  /*
   * Find the ancestor with matches this condition
   */
  ancestorNode(condition) {
    let node;

    while (this.hasParent()) {
      node = this.parent();
      if (condition(node)) {
        return node;
      }
    }

    return null;
  }

  /**
   * Given a condition returns true if the current node
   * or any of the parent nodes condition result is true
   */
  anyFamilyMember(condition) {
    if (condition(this)) {
      return true;
    }

    return this.ancestorNode(condition) !== null;
  }
  anyParent(condition) {
    return this.ancestorNode(condition) !== null;
  }

  reload(tree) {
    return new Promise((resolve) => {
      this.unload(tree)
        .then(() => {
          tree.setInode(this.domNode);
          tree.deselect(this.domNode);
          setTimeout(() => {
            tree.selectNode(this.domNode);
          }, 0);
          resolve();
        });
    });
  }

  unload(tree) {
    return new Promise((resolve, reject) => {
      this.children = [];
      tree.unload(this.domNode)
        .then(
          () => {
            resolve(true);
          },
          () => {
            reject();
          });
    });
  }


  open(tree, suppressNoDom) {
    return new Promise((resolve, reject) => {
      if (suppressNoDom && (this.domNode == null || typeof (this.domNode) === 'undefined')) {
        resolve(true);
      } else if (tree.isOpen(this.domNode)) {
        resolve(true);
      } else {
        tree.open(this.domNode).then(() => resolve(true), () => reject(true));
      }
    });
  }

}

export function isCollectionNode(node) {
  if (pgAdmin.Browser.Nodes && node in pgAdmin.Browser.Nodes) {
    if (pgAdmin.Browser.Nodes[node].is_collection !== undefined) return pgAdmin.Browser.Nodes[node].is_collection;
    else return false;
  }
  return false;
}
