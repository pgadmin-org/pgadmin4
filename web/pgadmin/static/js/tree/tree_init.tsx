/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import * as React from 'react';
import { render } from 'react-dom';
import { FileTreeX, TreeModelX } from 'pgadmin4-tree';
import {Tree} from './tree';

import { IBasicFileSystemHost, Directory } from 'react-aspen';
import { ManageTreeNodes } from './tree_nodes';
import pgAdmin from 'sources/pgadmin';

var initBrowserTree = async (pgBrowser) => {
  const MOUNT_POINT = '/browser'

  // Setup host
  let mtree = new ManageTreeNodes();

  // Init Tree with the Tree Parent node '/browser'
  mtree.init(MOUNT_POINT);

  const host: IBasicFileSystemHost = {
    pathStyle: 'unix',
    getItems: async (path) => {
      return mtree.readNode(path);
    },
    sortComparator: (a: FileEntry | Directory, b: FileEntry | Directory) => {
      // No nee to sort columns
      if (a._metadata && a._metadata.data._type == 'column') return 0;
      // Sort alphabetically
      if (a.constructor === b.constructor) {
        return pgAdmin.natural_sort(a.fileName, b.fileName);
      }
      let retval = 0;
      if (a.constructor === Directory) {
        retval = -1;
      } else if (b.constructor === Directory) {
        retval = 1;
      }
      return retval;
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

  await treeModelX.root.ensureLoaded();

  // Render Browser Tree
  await render(
      <FileTreeX model={treeModelX}
        onReady={itemHandle} create={create} remove={remove} update={update} height={'100%'} disableCache={true} />
     , document.getElementById('tree'));
}

module.exports = {
  initBrowserTree: initBrowserTree,
};

