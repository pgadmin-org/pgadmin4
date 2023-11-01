/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { LayoutDockerContext, LAYOUT_EVENTS } from './Layout';
import { usePgAdmin } from '../../../static/js/BrowserComponent';

export default function withStandardTabInfo(Component, tabId) {
  // eslint-disable-next-line react/display-name
  const HOCComponent = (props)=>{
    const [[isStale, nodeItem, nodeData], setNodeInfo] = useState([]);
    const pgAdmin = usePgAdmin();
    const node = nodeData && pgAdmin.Browser.Nodes[nodeData?._type];
    const treeNodeInfo = pgAdmin.Browser.tree?.getTreeNodeHierarchy(nodeItem);
    const [isActive, setIsActive] = React.useState(false);
    const layoutDocker = useContext(LayoutDockerContext);

    useEffect(()=>{
      const i = pgAdmin.Browser.tree?.selected();
      if(i) {
        setNodeInfo([i, pgAdmin.Browser.tree.itemData(i)]);
      }
      setIsActive(layoutDocker.isTabVisible(tabId));

      const onTabActive = _.debounce((currentTabId)=>{
        if(currentTabId == tabId) {
          setIsActive(true);
        } else {
          setIsActive(false);
        }
      }, 100);

      let deregisterTree = pgAdmin.Browser.Events.on('pgadmin-browser:node:selected', (item, data)=>{
        setNodeInfo([true, item, data]);
      });
      let deregisterTreeUpdate = pgAdmin.Browser.Events.on('pgadmin-browser:tree:updated', (item, data)=>{
        setNodeInfo([item, data]);
      });
      let deregisterActive = layoutDocker.eventBus.registerListener(LAYOUT_EVENTS.ACTIVE, onTabActive);
      // if there is any dock changes to the tab and it appears to be active/inactive
      let deregisterChange = layoutDocker.eventBus.registerListener(LAYOUT_EVENTS.CHANGE, (currentTabId)=>{
        if(currentTabId != tabId) return;
        if(layoutDocker.isTabVisible(tabId) && !isActive) {
          setIsActive(true);
        } else {
          setIsActive(false);
        }
      });

      return ()=>{
        onTabActive?.cancel();
        deregisterTree();
        deregisterTreeUpdate();
        deregisterActive();
        deregisterChange();
      };
    }, []);

    return (
      <Component
        {...props}
        nodeItem={nodeItem}
        nodeData={nodeData}
        node={node}
        treeNodeInfo={treeNodeInfo}
        isActive={isActive}
        isStale={isStale}
        setIsStale={(v)=>setNodeInfo((prev)=>[v, prev[1], prev[2]])}
      />
    );
  };

  HOCComponent.propTypes = {
    pgAdmin: PropTypes.object
  };

  return HOCComponent;
}
