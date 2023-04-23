/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import ReactDOM from 'react-dom';
import Theme from 'sources/Theme';
import Dependencies from '../../../misc/dependencies/static/js/Dependencies';
import Dependents from '../../../misc/dependents/static/js/Dependents';
import Statistics from '../../../misc/statistics/static/js/Statistics';
import SQL from '../../../misc/sql/static/js/SQL';
import Dashboard from '../../../dashboard/static/js/Dashboard';
import _ from 'lodash';
import { CollectionNodeView } from '../../../misc/properties/CollectionNodeProperties';
import Processes from '../../../misc/bgprocess/static/js/Processes';


/* The entry point for rendering React based view in properties, called in node.js */
export function getPanelView(
  tree,
  container,
  pgBrowser,
  panelType,
  panelVisible = true
) {
  let item = !_.isNull(tree)? tree.selected(): null,
    nodeData, node, treeNodeInfo, preferences, graphPref, dashPref;

  if (item){
    nodeData = tree.itemData(item);
    node = nodeData && pgBrowser.Nodes[nodeData._type];
    treeNodeInfo = pgBrowser.tree.getTreeNodeHierarchy(item);
    dashPref = pgBrowser.get_preferences_for_module('dashboards');
    graphPref = pgBrowser.get_preferences_for_module('graphs');
    preferences = _.merge(dashPref, graphPref);

  }
  if (panelType == 'dashboard') {
    ReactDOM.render(
      <Theme>
        <Dashboard
          treeNodeInfo={treeNodeInfo}
          pgBrowser={pgBrowser}
          nodeData={nodeData}
          node={node}
          item={item}
          preferences={preferences}
          did={((!_.isUndefined(treeNodeInfo)) && (!_.isUndefined(treeNodeInfo['database']))) ? treeNodeInfo['database']._id: 0}
          sid={!_.isUndefined(treeNodeInfo) && !_.isUndefined(treeNodeInfo['server']) ? treeNodeInfo['server']._id : ''}
          serverConnected={!_.isUndefined(treeNodeInfo) && !_.isUndefined(treeNodeInfo['server']) ? treeNodeInfo.server.connected: false}
          dbConnected={!_.isUndefined(treeNodeInfo) && !_.isUndefined(treeNodeInfo['database']) ? treeNodeInfo.database.connected: false}
          panelVisible={panelVisible}
        />
      </Theme>,
      container
    );
  }
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
  if (panelType == 'properties' && nodeData?.is_collection) {
    ReactDOM.render(
      <Theme>
        <CollectionNodeView
          treeNodeInfo={treeNodeInfo}
          item={item}
          itemNodeData={nodeData}
          node={node}
          pgBrowser={pgBrowser}
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
  if (panelType == 'sql') {
    ReactDOM.render(
      <Theme>
        <SQL
          treeNodeInfo={treeNodeInfo}
          pgBrowser={pgBrowser}
          nodeData={nodeData}
          node={node}
          item={item}
          did={((!_.isUndefined(treeNodeInfo)) && (!_.isUndefined(treeNodeInfo['database']))) ? treeNodeInfo['database']._id: 0}
          dbConnected={!_.isUndefined(treeNodeInfo) && !_.isUndefined(treeNodeInfo['database']) ? treeNodeInfo.database.connected: false}
        />
      </Theme>,
      container
    );
  }
  if (panelType == 'processes') {
    ReactDOM.render(
      <Theme>
        <Processes />
      </Theme>,
      container
    );
  }
}

/* When switching from normal node to collection node, clean up the React mounted DOM */
export function removePanelView(container) {
  ReactDOM.unmountComponentAtNode(container);
}
