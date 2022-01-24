/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import ReactDOM from 'react-dom';
import Theme from 'sources/Theme';
import Dependencies from '../../../misc/dependencies/static/js/Dependencies';
import Dependents from '../../../misc/dependents/static/js/Dependents';
import Statistics from '../../../misc/statistics/static/js/Statistics';

/* The entry point for rendering React based view in properties, called in node.js */
export function getPanelView(
  tree,
  container,
  pgBrowser,
  panelType
) {
  let item = tree.selected(),
    nodeData = item && tree.itemData(item),
    node = item && nodeData && pgBrowser.Nodes[nodeData._type],
    treeNodeInfo = pgBrowser.tree.getTreeNodeHierarchy(item);


  if (panelType == 'statistics') {
    ReactDOM.render(
      <Theme>
        <Statistics
          treeNodeInfo={treeNodeInfo}
          pgBrowser={pgBrowser}
          nodeData={nodeData}
          node={node}
          item={item}
        />
      </Theme>,
      container
    );
  }
  if (panelType == 'dependencies') {
    ReactDOM.render(
      <Theme>
        <Dependencies
          treeNodeInfo={treeNodeInfo}
          pgBrowser={pgBrowser}
          nodeData={nodeData}
          node={node}
          item={item}
        />
      </Theme>,
      container
    );
  }
  if (panelType == 'dependents') {
    ReactDOM.render(
      <Theme>
        <Dependents
          treeNodeInfo={treeNodeInfo}
          pgBrowser={pgBrowser}
          nodeData={nodeData}
          node={node}
          item={item}
        />
      </Theme>,
      container
    );
  }
}

/* When switching from normal node to collection node, clean up the React mounted DOM */
export function removePanelView(container) {
  ReactDOM.unmountComponentAtNode(container);
}
