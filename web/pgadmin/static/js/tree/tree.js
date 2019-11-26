//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import {isValidData} from 'sources/utils';
import $ from 'jquery';
import Alertify from 'pgadmin.alertifyjs';

export class TreeNode {
  constructor(id, data, domNode, parent) {
    this.id = id;
    this.data = data;
    this.setParent(parent);
    this.children = [];
    this.domNode = domNode;
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
    if (parent !== null && parent !== undefined && parent.path !== undefined) {
      this.path = parent.path + '.' + this.id;
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

  reload(tree) {
    this.unload(tree);
    tree.aciTreeApi.setInode(this.domNode);
    tree.aciTreeApi.deselect(this.domNode);
    setTimeout(() => {
      tree.selectNode(this.domNode);
    }, 0);
  }

  unload(tree) {
    this.children = [];
    tree.aciTreeApi.unload(this.domNode);
  }

  /*
   * Find the ancestor with matches this condition
   */
  ancestorNode(condition) {
    let node = this;

    while (node.hasParent()) {
      node = node.parent();
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
    if(condition(this)) {
      return true;
    }

    return this.ancestorNode(condition) !== null;
  }
  anyParent(condition) {
    return this.ancestorNode(condition) !== null;
  }
}

export class Tree {
  constructor() {
    this.rootNode = new TreeNode(undefined, {});
    this.aciTreeApi = undefined;
    this.draggableTypes = {};
  }

  /*
   *
   * The dropDetailsFunc should return an object of sample
   * {text: 'xyz', cur: {from:0, to:0} where text is the drop text and
   * cur is selection range of text after dropping. If returned as
   * string, by default cursor will be set to the end of text
   */
  registerDraggableType(typeOrTypeDict, dropDetailsFunc=null) {
    if(typeof typeOrTypeDict == 'object') {
      Object.keys(typeOrTypeDict).forEach((type)=>{
        this.registerDraggableType(type, typeOrTypeDict[type]);
      });
    } else {
      if(dropDetailsFunc != null) {
        typeOrTypeDict.replace(/ +/, ' ').split(' ').forEach((type)=>{
          this.draggableTypes[type] = dropDetailsFunc;
        });
      }
    }
  }

  getDraggable(type) {
    if(this.draggableTypes[type]) {
      return this.draggableTypes[type];
    } else {
      return null;
    }
  }

  prepareDraggable(data, item) {
    let dropDetailsFunc = this.getDraggable(data._type);

    if(dropDetailsFunc != null) {

      /* addEventListener is used here because import jquery.drag.event
       * overrides the dragstart event set using element.on('dragstart')
       * This will avoid conflict.
       */
      item.find('.aciTreeItem')
        .attr('draggable', true)[0]
        .addEventListener('dragstart', (e)=> {
          let dropDetails = dropDetailsFunc(data, item);

          if(typeof dropDetails == 'string') {
            dropDetails = {
              text:dropDetails,
              cur:{
                from:dropDetails.length,
                to: dropDetails.length,
              },
            };
          } else {
            if(!dropDetails.cur) {
              dropDetails = {
                ...dropDetails,
                cur:{
                  from:dropDetails.text.length,
                  to: dropDetails.text.length,
                },
              };
            }
          }

          e.dataTransfer.setData('text', JSON.stringify(dropDetails));
          /* Required by Firefox */
          if(e.dataTransfer.dropEffect) {
            e.dataTransfer.dropEffect = 'move';
          }

          /* setDragImage is not supported in IE. We leave it to
           * its default look and feel
           */
          if(e.dataTransfer.setDragImage) {
            let dragItem = $(`
              <div class="drag-tree-node">
                <span>${_.escape(dropDetails.text)}</span>
              </div>`
            );

            $('body .drag-tree-node').remove();
            $('body').append(dragItem);

            e.dataTransfer.setDragImage(dragItem[0], 0, 0);
          }
        });
    }
  }

  addNewNode(id, data, domNode, parentPath) {
    const parent = this.findNode(parentPath);
    return this.createOrUpdateNode(id, data, parent, domNode);
  }

  findNode(path) {
    if (path === null || path === undefined || path.length === 0) {
      return this.rootNode;
    }
    return findInTree(this.rootNode, path.join('.'));
  }

  findNodeByDomElement(domElement) {
    const path = this.translateTreeNodeIdFromACITree(domElement);
    if(!path || !path[0]) {
      return undefined;
    }

    return this.findNode(path);
  }

  selected() {
    return this.aciTreeApi.selected();
  }

  selectNode(aciTreeIdentifier) {
    this.aciTreeApi.select(aciTreeIdentifier);
  }

  createOrUpdateNode(id, data, parent, domNode) {
    let oldNodePath = [id];
    if(parent !== null && parent !== undefined) {
      oldNodePath = [parent.path, id];
    }
    const oldNode = this.findNode(oldNodePath);
    if (oldNode !== null) {
      oldNode.data = data;
      return oldNode;
    }

    const node = new TreeNode(id, data, domNode, parent);
    if (parent === this.rootNode) {
      node.parentNode = null;
    }
    parent.children.push(node);
    return node;
  }

  /**
   * Given the JQuery object that contains the ACI Tree
   * this method is responsible for registering this tree class
   * to listen to all the events that happen in the ACI Tree.
   *
   * At this point in time the only event that we care about is
   * the addition of a new node.
   * The function will create a new tree node to store the information
   * that exist in the ACI for it.
   */
  register($treeJQuery) {
    $treeJQuery.on('acitree', function (event, api, item, eventName) {
      if (api.isItem(item)) {
        /* If the id of node is changed, the path should also be changed */
        if (eventName === 'added' || eventName === 'idset') {
          const id = api.getId(item);
          const data = api.itemData(item);

          if(eventName === 'added') {
            this.prepareDraggable(data, item);
          }

          const parentId = this.translateTreeNodeIdFromACITree(api.parent(item));
          this.addNewNode(id, data, item, parentId);
          if(data.errmsg) {
            Alertify.error(data.errmsg);
          }
        }
      }
    }.bind(this));
    this.aciTreeApi = $treeJQuery.aciTree('api');
  }

  /**
   * As the name hints this functions works as a layer in between ACI and
   * the adaptor. Given a ACITree JQuery node find the location of it in the
   * Tree and then returns and array with the path to to the Tree Node in
   * question
   *
   * This is not optimized and will always go through the full tree
   */
  translateTreeNodeIdFromACITree(aciTreeNode) {
    let currentTreeNode = aciTreeNode;
    let path = [];
    while (currentTreeNode !== null && currentTreeNode !== undefined && currentTreeNode.length > 0) {
      path.unshift(this.aciTreeApi.getId(currentTreeNode));
      if (this.aciTreeApi.hasParent(currentTreeNode)) {
        currentTreeNode = this.aciTreeApi.parent(currentTreeNode);
      } else {
        break;
      }
    }
    return path;
  }
}

/**
 * Given an initial node and a path, it will navigate through
 * the new tree to find the node that matches the path
 */
function findInTree(rootNode, path) {
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

let isValidTreeNodeData = isValidData;

export {isValidTreeNodeData};
