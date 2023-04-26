//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import _ from 'lodash';
import pgAdmin from 'sources/pgadmin';

import { FileType } from 'react-aspen';
import { TreeNode } from './tree_nodes';

function manageTreeEvents(event, eventName, item) {
  let d = item ? item._metadata.data : [];
  let node_metadata = item ? item._metadata : {};
  let node;
  let obj = pgAdmin.Browser;

  // Events for preferences tree.
  if (node_metadata.parent && node_metadata.parent.includes('/preferences') && obj.ptree.tree.type == 'preferences') {
    try {
      obj.Events.trigger(
        'preferences:tree:' + eventName, event, item, d
      );
    } catch (e) {
      console.warn(e.stack || e);
      return false;
    }
  } else if(eventName == 'hovered') {
    /* Raise tree events for the nodes */
    try {
      obj.Events.trigger(
        'pgadmin-browser:tree:' + eventName, item, d, node
      );
    } catch (e) {
      console.warn(e.stack || e);
      return false;
    }
  } else {
    // Events for browser tree.
    if (d && obj.Nodes[d._type]) {
      node = obj.Nodes[d._type];

      // If the Browser tree is not initialised yet
      if (obj.tree === null) return;

      if (eventName == 'dragstart') {
        obj.tree.handleDraggable(event, item);
      }
      if (eventName == 'added' || eventName == 'beforeopen' || eventName == 'loaded') {
        obj.tree.addNewNode(item.getMetadata('data').id, item.getMetadata('data'), item, item.parent.path);
      }
      if(eventName == 'copied') {
        obj.tree.copyHandler?.(item.getMetadata('data'), item);
      }
      if (_.isObject(node.callbacks) &&
        eventName in node.callbacks &&
        typeof node.callbacks[eventName] == 'function' &&
        !node.callbacks[eventName].apply(
          node, [item, d, obj, [], eventName])) {
        return true;
      }

      /* Raise tree events for the nodes */
      try {
        obj.Events.trigger(
          'pgadmin-browser:tree:' + eventName, item, d, node
        );
      } catch (e) {
        console.warn(e.stack || e);
        return false;
      }
    }
  }
  return true;
}


export class Tree {
  constructor(tree, manageTree, pgBrowser, type) {
    this.tree = tree;
    this.tree.type = type ? type : 'browser';
    this.tree.onTreeEvents(manageTreeEvents);

    this.rootNode = manageTree.tempTree;
    this.Nodes = pgBrowser ? pgBrowser.Nodes : pgAdmin.Browser.Nodes;

    this.draggableTypes = {};
  }

  async refresh(item) {
    //  Set _children to null as empty array not reload the children nodes on refresh.
    if(item.children?.length == 0) {
      item._children = null;
    }
    await this.tree.refresh(item);
  }

  async add(item, data) {
    await this.tree.create(item.parent, data.itemData);
  }

  async before(item, data) {
    return Promise.resolve(await this.tree.create(item.parent, data));
  }

  async update(item, data) {
    await this.tree.update(item, data);
  }

  async remove(item) {
    await this.tree.remove(item);
  }

  async append(item, data) {
    return Promise.resolve(await this.tree.create(item, data));
  }

  async destroy() {
    const model = this.tree.getModel();
    this.rootNode.children = [];
    if (model.root) {
      model.root.isExpanded = false;
      await model.root.hardReloadChildren();
    }
  }

  next(item) {
    if (item) {
      let parent = this.parent(item);
      if (parent && parent.children.length > 0) {
        let idx = parent.children.indexOf(item);
        if (idx !== -1 && parent.children.length !== idx + 1) {
          return parent.children[idx + 1];
        }
      }
    }
    return null;
  }

  prev(item) {
    if (item) {
      let parent = this.parent(item);
      if (parent && parent.children.length > 0) {
        let idx = parent.children.indexOf(item);
        if (idx !== -1 && idx !== 0) {
          return parent.children[idx - 1];
        }
      }
    }
    return null;
  }

  async open(item) {
    if (this.isOpen(item)) { return true; }
    await this.tree.toggleDirectory(item);
  }

  async ensureLoaded(item) {
    await item.ensureLoaded();
  }

  async ensureVisible(item, align='auto') {
    await this.tree.ensureVisible(item, align);
  }

  async openPath(item) {
    parent = item.parent;
    await this.tree.openDirectory(parent);
  }

  async close(item) {
    await this.tree.closeDir(item);
  }

  async toggle(item) {
    await this.tree.toggleDirectory(item);
  }

  async select(item, ensureVisible = false, align = 'auto') {
    await this.tree.setActiveFile(item, ensureVisible, align);
  }

  async selectNode(item, ensureVisible = false, align = 'auto') {
    this.tree.setActiveFile(item, ensureVisible, align);
  }

  async unload(item) {
    await this.tree.unload(item);
  }

  async addIcon(item, icon) {
    if (item !== undefined && item.getMetadata('data') !== undefined) {
      item.getMetadata('data').icon = icon.icon;
    }
    await this.tree.addIcon(item, icon);
  }

  removeIcon() {
    // TBD
  }

  setLeaf() {
    // TBD
  }
  async setLabel(item, label) {
    if (item) {
      await this.tree.setLabel(item, label);
    }
  }

  async setInode(item) {
    if (item._children) item._children = null;
    await this.tree.closeDirectory(item);
  }

  async setId(item, data) {
    if (item) {
      item.getMetadata('data').id = data.id;
    }
  }

  deselect(item) {
    this.tree.deSelectActiveFile(item);
  }

  wasInit() {
    // TBD
    return true;
  }

  wasLoad(item) {
    if (item && item.type === FileType.Directory) {
      return item.isExpanded && item.children != null && item.children.length > 0;
    }
    return true;
  }

  parent(item) {
    return item.parent;
  }

  first(item) {
    const model = this.tree.getModel();
    if ((item === undefined || item === null) && model.root.children !== null) {
      return model.root.children[0];
    }

    if (item !== undefined && item !== null && item.branchSize > 0) {
      return item.children[0];
    }

    return null;
  }

  children(item) {
    const model = this.tree.getModel();
    if (item) {
      return (item.children !== null ? item.children : []);
    }
    return model.root.children;
  }

  itemFrom(domElem) {
    return this.tree.getItemFromDOM(domElem);
  }

  DOMFrom(item) {
    return this.tree.getDOMFromItem(item);
  }

  addCssClass(item, cssClass) {
    this.tree.addCssClass(item, cssClass);
  }

  path(item) {
    if (item) return item.path;
  }

  pathId(item) {
    if (item) {
      let pathIds = item.path.split('/');
      pathIds.splice(0, 1);
      return pathIds;
    }
    return [];
  }

  itemFromDOM(domElem) {
    return this.tree.getItemFromDOM(domElem[0]);
  }

  siblings(item) {
    if (this.hasParent(item)) {
      let _siblings = this.parent(item).children.filter((_item) => _item.path !== item.path);
      if (typeof (_siblings) !== 'object') return [_siblings];
      else return _siblings;
    }
    return [];
  }

  hasParent(item) {
    return item && item.parent ? true : false;
  }

  isOpen(item) {
    if (item.type === FileType.Directory) {
      return item.isExpanded;
    }
    return false;
  }

  isClosed(item) {
    if (item.type === FileType.Directory) {
      return !item.isExpanded;
    }
    return false;
  }

  itemData(item) {
    return (item !== undefined && item !== null && item.getMetadata('data') !== undefined) ? item._metadata.data : [];
  }

  getData(item) {
    return (item !== undefined && item.getMetadata('data') !== undefined) ? item._metadata.data : [];
  }

  isRootNode(item) {
    const model = this.tree.getModel();
    return item === model.root;
  }

  isInode(item) {
    const children = this.children(item);
    if (children === null || children === undefined) return false;
    return children.length > 0 ? true : false;
  }

  selected() {
    return this.tree.getActiveFile();
  }

  resizeTree() {
    this.tree.resize();
  }

  findNodeWithToggle(path) {
    let tree = this;

    if (path == null || !Array.isArray(path)) {
      return Promise.reject();
    }
    const basepath = '/browser/' + path.slice(0, path.length-1).join('/') + '/';
    path = '/browser/' + path.join('/');

    let onCorrectPath = function (matchPath) {
      return (matchPath !== undefined && path !== undefined
        && (basepath.startsWith(`${matchPath}/`) || path === matchPath));
    };

    return (function findInNode(currentNode) {
      return new Promise((resolve, reject) => {
        if (path === null || path === undefined || path.length === 0) {
          resolve(null);
        }
        /* No point in checking the children if
         * the path for currentNode itself is not matching
         */
        if (currentNode.path !== undefined && !onCorrectPath(currentNode.path)) {
          reject(null);
        } else if (currentNode.path === path) {
          resolve(currentNode);
        } else {
          tree.open(currentNode)
            .then(() => {
              let children = currentNode.children;
              for (let i = 0, length = children.length; i < length; i++) {
                let childNode = children[i];
                if (onCorrectPath(childNode.path)) {
                  resolve(findInNode(childNode));
                  return;
                }
              }
              reject(null);
            })
            .catch(() => {
              reject(null);
            });
        }
      });
    })(tree.tree.getModel().root);
  }

  getNodeDisplayPath(item, separator='/', skip_coll=false) {
    let retStack = [];
    let currItem = item;
    while(currItem?.fileName) {
      const data = currItem._metadata?.data;
      if(data._type.startsWith('coll-') && skip_coll) {
        /* Skip collection */
      } else {
        retStack.push(data._label);
      }
      currItem = currItem.parent;
    }
    retStack = retStack.reverse();
    if(separator == false) return retStack;
    return retStack.join(separator);
  }

  findNodeByDomElement(domElement) {
    const path = domElement.path;
    if (!path || !path[0]) {
      return undefined;
    }

    return this.findNode(path);
  }

  addNewNode(id, data, item, parentPath) {
    let parent;
    parent = this.findNode(parentPath);
    return this.createOrUpdateNode(id, data, parent, item);
  }

  findNode(path) {
    if (path === null || path === undefined || path.length === 0) {
      return this.rootNode;
    }
    return findInTree(this.rootNode, path);
  }

  createOrUpdateNode(id, data, parent, domNode) {
    let oldNodePath = id;
    if (parent !== null && parent !== undefined && parent.path !== undefined && parent.path != '/browser') {
      oldNodePath = parent.path + '/' + id;
    }
    const oldNode = this.findNode(oldNodePath);
    if (oldNode !== null) {
      oldNode.data = data;
      oldNode.domNode = domNode;
      return oldNode;
    }

    const node = new TreeNode(id, data, domNode, parent);
    if (parent === this.rootNode) {
      node.parentNode = null;
    }

    if (parent !== null && parent !== undefined)
      parent.children.push(node);
    return node;
  }

  translateTreeNodeIdFromReactTree(treeNode) {
    let currentTreeNode = treeNode;
    let path = [];
    while (currentTreeNode !== null && currentTreeNode !== undefined) {
      if (currentTreeNode.path !== '/browser') path.unshift(currentTreeNode.path);
      if (this.hasParent(currentTreeNode)) {
        currentTreeNode = this.parent(currentTreeNode);
      } else {
        break;
      }
    }
    return path;
  }

  getTreeNodeHierarchy(identifier) {
    let idx = 0;
    let node_cnt = 0;
    let result = {};
    if (identifier === undefined) return;
    let item = TreeNode.prototype.isPrototypeOf(identifier) ? identifier : this.findNode(identifier.path);
    if (item === undefined) return;
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

  /*
   *
   * The dropDetailsFunc should return an object of sample
   * {text: 'xyz', cur: {from:0, to:0} where text is the drop text and
   * cur is selection range of text after dropping. If returned as
   * string, by default cursor will be set to the end of text
   */
  registerDraggableType(typeOrTypeDict, dropDetailsFunc = null) {
    if (typeof typeOrTypeDict == 'object') {
      Object.keys(typeOrTypeDict).forEach((type) => {
        this.registerDraggableType(type, typeOrTypeDict[type]);
      });
    } else {
      if (dropDetailsFunc != null) {
        typeOrTypeDict.replace(/ +/, ' ').split(' ').forEach((type) => {
          this.draggableTypes[type] = dropDetailsFunc;
        });
      }
    }
  }

  getDraggable(type) {
    if (this.draggableTypes[type]) {
      return this.draggableTypes[type];
    } else {
      return null;
    }
  }

  handleDraggable(e, item) {
    let data = item.getMetadata('data');
    let dropDetailsFunc = this.getDraggable(data._type);

    if (dropDetailsFunc != null) {

      /* addEventListener is used here because import jquery.drag.event
       * overrides the dragstart event set using element.on('dragstart')
       * This will avoid conflict.
       */
      let dropDetails = dropDetailsFunc(data, item, this.getTreeNodeHierarchy(item));

      if (typeof dropDetails == 'string') {
        dropDetails = {
          text: dropDetails,
          cur: {
            from: dropDetails.length,
            to: dropDetails.length,
          },
        };
      } else {
        if (!dropDetails.cur) {
          dropDetails = {
            ...dropDetails,
            cur: {
              from: dropDetails.text.length,
              to: dropDetails.text.length,
            },
          };
        }
      }

      e.dataTransfer.setData('text', JSON.stringify(dropDetails));
      /* Required by Firefox */
      if (e.dataTransfer.dropEffect) {
        e.dataTransfer.dropEffect = 'move';
      }

      /* setDragImage is not supported in IE. We leave it to
      * its default look and feel
      */
      if (e.dataTransfer.setDragImage) {
        const dragItem = document.createElement('div');
        dragItem.classList.add('drag-tree-node');
        dragItem.innerHTML = `<span>${_.escape(dropDetails.text)}</span>`;

        document.querySelector('body .drag-tree-node')?.remove();
        document.body.appendChild(dragItem);

        e.dataTransfer.setDragImage(dragItem, 0, 0);
      }
    }
    else {
      e.preventDefault();
    }
  }

  onNodeCopy(copyCallback) {
    this.copyHandler = copyCallback;
  }
}

function mapType(type, idx) {
  return (type === 'partition' && idx > 0) ? 'table' : type;
}



/**
 * Given an initial node and a path, it will navigate through
 * the new tree to find the node that matches the path
 */
export function findInTree(rootNode, path) {
  if (path === null) {
    return rootNode;
  }
  return (function findInNode(currentNode) {

    /* No point in checking the children if
     * the path for currentNode itself is not matching
     */
    if (currentNode.path !== undefined && path !== undefined
      && !path.startsWith(currentNode.path)) {
      return null;
    }

    for (let i = 0, length = currentNode.children.length; i < length; i++) {
      const calculatedNode = findInNode(currentNode.children[i]);
      if (calculatedNode !== null) {
        return calculatedNode;
      }
    }

    if (currentNode.path === path) {
      return currentNode;
    } else {
      return null;
    }
  })(rootNode);
}

let isValidTreeNodeData = (data) => (!_.isEmpty(data));

export { isValidTreeNodeData };
