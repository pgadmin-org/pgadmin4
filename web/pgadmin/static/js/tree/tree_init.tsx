/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import * as React from 'react';
import { render } from 'react-dom';
import { FileTreeX, TreeModelX } from 'pgadmin4-tree';
import {Tree} from './tree';

import { IBasicFileSystemHost } from 'react-aspen';
import { ManageTreeNodes } from './tree_nodes'

var initBrowserTree = async (pgBrowser) => {
  const MOUNT_POINT = '/browser'

  // Setup host
  let mtree = new ManageTreeNodes();

  // Init Tree with the Tree Parent node '/browser'
  mtree.init(MOUNT_POINT);

  const host: IBasicFileSystemHost = {
    pathStyle: 'unix',
    getItems: async (path) => {
      let nodes = await mtree.readNode(path);
      return nodes;
    },
  }

  // Create Node
  const create = async (parentPath, _data): Promise<IFileEntryItem> => {
    try {
      let _node_path = parentPath + "/" + _data.id
      return mtree.addNode(parentPath, _node_path, _data)
    } catch (error) {
      return null // or throw error as you see fit
    }
  }


  // Remove Node
  const remove = async (path: string, _removeOnlyChild): Promise<boolean> => {
    try {
      await mtree.removeNode(path, _removeOnlyChild);
      return true
    } catch (error) {
      return false // or throw error as you see fit
    }
  }

  // Update Node
  const update = async (path: string, data): Promise<boolean> => {
    try {
      await mtree.updateNode(path, data);
      return true
    } catch (error) {
      return false // or throw error as you see fit
    }
  }

  const treeModelX = new TreeModelX(host, MOUNT_POINT)

  const itemHandle = function onReady(handler) {
    // Initialize pgBrowser Tree
    pgBrowser.tree = new Tree(handler, mtree, pgBrowser);
    return true;
  }

  await treeModelX.root.ensureLoaded()

  // Render Browser Tree
  await render(
    <div>
      <FileTreeX height={950} width={'100%'} model={treeModelX}
        onReady={itemHandle} create={create} remove={remove} update={update}/>
     </div>, document.getElementById('tree'));
}

module.exports = {
  initBrowserTree: initBrowserTree,
};

