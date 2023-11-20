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
import ErrorBoundary from './ErrorBoundary';

export default function withStandardTabInfo(Component, tabId) {
  // eslint-disable-next-line react/display-name
  const HOCComponent = (props)=>{
    const [[isStale, nodeItem, nodeData], setNodeInfo] = useState([true, undefined, undefined]);
    const pgAdmin = usePgAdmin();
    const node = nodeData && pgAdmin.Browser.Nodes[nodeData?._type];
    const treeNodeInfo = pgAdmin.Browser.tree?.getTreeNodeHierarchy(nodeItem);
    const [isActive, setIsActive] = React.useState(false);
    const layoutDocker = useContext(LayoutDockerContext);

    useEffect(()=>{
      const i = pgAdmin.Browser.tree?.selected();
      if(i) {
        setNodeInfo([true, i, pgAdmin.Browser.tree.itemData(i)]);
      }
      setIsActive(layoutDocker.isTabVisible(tabId));

      const onTabActive = _.debounce(()=>{
        if(layoutDocker.isTabVisible(tabId)) {
          !isActive && setIsActive(true);
        } else {
          isActive && setIsActive(false);
        }
      }, 100);

      const onUpdate =  (item, data)=>{
        setNodeInfo([true, item, data]);
      };

      let deregisterTree = pgAdmin.Browser.Events.on('pgadmin-browser:node:selected', onUpdate);
      let deregisterTreeUpdate = pgAdmin.Browser.Events.on('pgadmin-browser:tree:updated', onUpdate);
      let deregisterDbConnected = pgAdmin.Browser.Events.on('pgadmin:database:connected', onUpdate);
      let deregisterServerConnected = pgAdmin.Browser.Events.on('pgadmin:server:connected', (_sid, item, data)=>{
        setNodeInfo([true, item, data]);
      });
      let deregisterActive = layoutDocker.eventBus.registerListener(LAYOUT_EVENTS.ACTIVE, onTabActive);
      // if there is any dock changes to the tab and it appears to be active/inactive
      let deregisterChange = layoutDocker.eventBus.registerListener(LAYOUT_EVENTS.CHANGE, onTabActive);

      return ()=>{
        onTabActive?.cancel();
        deregisterTree();
        deregisterTreeUpdate();
        deregisterDbConnected();
        deregisterServerConnected();
        deregisterActive();
        deregisterChange();
      };
    }, []);

    return (
      <ErrorBoundary>
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
      </ErrorBoundary>
    );
  };

  HOCComponent.propTypes = {
    pgAdmin: PropTypes.object
  };

  return HOCComponent;
}
