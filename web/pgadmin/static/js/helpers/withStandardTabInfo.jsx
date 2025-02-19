/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { LayoutDockerContext, LAYOUT_EVENTS } from './Layout';
import { usePgAdmin } from '../../../static/js/PgAdminProvider';
import ErrorBoundary from './ErrorBoundary';

export default function withStandardTabInfo(Component, tabId) {
   
  const HOCComponent = (props)=>{
    const [[isStale, nodeItem, nodeData], setNodeInfo] = useState([true, undefined, undefined]);
    const pgAdmin = usePgAdmin();
    const node = nodeData && pgAdmin.Browser.Nodes[nodeData?._type];
    const treeNodeInfo = pgAdmin.Browser.tree?.getTreeNodeHierarchy(nodeItem);
    const [isActive, setIsActive] = React.useState(false);
    const layoutDocker = useContext(LayoutDockerContext);

    useEffect(() => {
      const i = pgAdmin.Browser.tree?.selected();
      if(i) {
        setNodeInfo([true, i, pgAdmin.Browser.tree.itemData(i)]);
      }
      setIsActive(layoutDocker.isTabVisible(tabId));

      const onTabActive = _.debounce(()=>{
        if(layoutDocker.isTabVisible(tabId)) {
          setIsActive(true);
        } else {
          setIsActive(false);
        }
      }, 100);

      const onUpdate =  () => {
        // Only use the selected tree node item.
        const item = pgAdmin.Browser.tree?.selected();
        setNodeInfo([
          true, item, item && pgAdmin.Browser.tree.itemData(item)
        ]);
      };

      let destroyTree = pgAdmin.Browser.Events.on('pgadmin-browser:tree:destroyed', onUpdate);
      let deregisterTree = pgAdmin.Browser.Events.on('pgadmin-browser:node:selected', onUpdate);
      let deregisterTreeUpdate = pgAdmin.Browser.Events.on('pgadmin-browser:tree:updated', onUpdate);
      let deregisterDbConnected = pgAdmin.Browser.Events.on('pgadmin:database:connected', onUpdate);
      let deregisterServerConnected = pgAdmin.Browser.Events.on('pgadmin:server:connected', onUpdate);
      let deregisterActive = layoutDocker.eventBus.registerListener(LAYOUT_EVENTS.ACTIVE, onTabActive);
      // if there is any dock changes to the tab and it appears to be active/inactive
      let deregisterChange = layoutDocker.eventBus.registerListener(LAYOUT_EVENTS.CHANGE, onTabActive);

      return () => {
        onTabActive?.cancel();
        destroyTree();
        deregisterTree();
        deregisterTreeUpdate();
        deregisterDbConnected();
        deregisterServerConnected();
        deregisterActive();
        deregisterChange();
      };
    }, []);

    ////////
    // Special case:
    //
    // When the tree is being recreated during reloading on changes of some
    // preferences, it is possible that the tree returns 'selected' node, but -
    // it does not have the 'treeNodeInfo' as it was actually part of the
    // previous instance of the tree.
    //
    // In that case - we consider that there is no node selected in the tree.
    ///////
    return (
      <ErrorBoundary>
        <Component
          {...props}
          nodeItem={treeNodeInfo ? nodeItem : undefined}
          nodeData={treeNodeInfo ? nodeData : undefined}
          node={treeNodeInfo ? node : undefined}
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
