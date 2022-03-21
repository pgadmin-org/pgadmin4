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
import { ManagePreferenceTreeNodes } from './preference_nodes';

var initPreferencesTree = async (pgBrowser, container, data) => {
  const MOUNT_POINT = '/preferences'

  // Setup host
  let ptree = new ManagePreferenceTreeNodes(data);

  // Init Tree with the Tree Parent node '/browser'
  ptree.init(MOUNT_POINT);
  const host: IBasicFileSystemHost = {
    pathStyle: 'unix',
    getItems: async (path) => {
      return ptree.readNode(path);
    },
  }

  const pTreeModelX = new TreeModelX(host, MOUNT_POINT)

  const itemHandle = function onReady(handler) {
    // Initialize pgBrowser Tree
    pgBrowser.ptree = new Tree(handler, ptree, pgBrowser, false);
    return true;
  }

  await pTreeModelX.root.ensureLoaded()

  // Render Browser Tree
  await render(
      <FileTreeX model={pTreeModelX}
        onReady={itemHandle} />
     , container);
}

module.exports = {
    initPreferencesTree: initPreferencesTree,
};

