/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';
import PropTypes from 'prop-types';
import LogReplication from './LogReplication';
import EmptyPanelMessage from '../../../../static/js/components/EmptyPanelMessage';
import PGDReplication from './PGDReplication';

export default function Replication({preferences, treeNodeInfo, pageVisible}) {
  const replicationType = treeNodeInfo?.server?.replication_type;
  if(replicationType == 'log') {
    return <LogReplication treeNodeInfo={treeNodeInfo} pageVisible={pageVisible} />;
  } else if(replicationType == 'pgd') {
    return <PGDReplication preferences={preferences} treeNodeInfo={treeNodeInfo} pageVisible={pageVisible} />;
  } else {
    return <EmptyPanelMessage text='No replication' />;
  }
}

Replication.propTypes = {
  preferences: PropTypes.object,
  treeNodeInfo: PropTypes.object.isRequired,
  pageVisible: PropTypes.bool,
};
