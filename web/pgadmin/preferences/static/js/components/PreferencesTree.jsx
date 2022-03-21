// /////////////////////////////////////////////////////////////
// //
// // pgAdmin 4 - PostgreSQL Tools
// //
// // Copyright (C) 2013 - 2022, The pgAdmin Development Team
// // This software is released under the PostgreSQL Licence
// //
// //////////////////////////////////////////////////////////////

import * as React from 'react';
import { render } from 'react-dom';
import { Directory } from 'react-aspen';
import { FileTreeX, TreeModelX } from 'pgadmin4-tree';
import {Tree} from '../../../../static/js/tree/tree';
import { ManagePreferenceTreeNodes } from '../../../../static/js/tree/preference_nodes';
import pgAdmin from 'sources/pgadmin';

var initPreferencesTree = async (pgBrowser, containerElement, data) => {
  const MOUNT_POINT = '/preferences';

  // Setup host
  let ptree = new ManagePreferenceTreeNodes(data);

  // Init Tree with the Tree Parent node '/browser'
  ptree.init(MOUNT_POINT);

  const host = {
    pathStyle: 'unix',
    getItems: async (path) => {
      return ptree.readNode(path);
    },
    sortComparator: (a, b) => {
      // No nee to sort Query tool options.
      if (a._parent && a._parent._fileName == 'Query Tool') return 0;
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
  };

  const pTreeModelX = new TreeModelX(host, MOUNT_POINT);

  const itemHandle = function onReady(handler) {
    // Initialize preferences Tree
    pgBrowser.ptree = new Tree(handler, ptree, pgBrowser, 'preferences');
    return true;
  };

  await pTreeModelX.root.ensureLoaded();

  // Render Browser Tree
  await render(
    <FileTreeX model={pTreeModelX} height={'100%'}
      onReady={itemHandle} />
    , containerElement);
};

module.exports = {
  initPreferencesTree: initPreferencesTree,
};