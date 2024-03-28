/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Box } from '@material-ui/core';
import React, { useEffect, useState } from 'react';

import gettext from 'sources/gettext';
import ReplicationSlotsSchema from './replication_slots.ui';
import PgTable from 'sources/components/PgTable';
import getApiInstance, { parseApiError } from '../../../../static/js/api_instance';
import SectionContainer from '../components/SectionContainer';
import ReplicationStatsSchema from './replication_stats.ui';
import RefreshButton from '../components/RefreshButtons';
import { getExpandCell, getSwitchCell } from '../../../../static/js/components/PgTable';
import { usePgAdmin } from '../../../../static/js/BrowserComponent';
import url_for from 'sources/url_for';
import PropTypes from 'prop-types';


const replicationStatsColumns = [{
  accessor: 'view_details',
  Header: () => null,
  sortable: false,
  resizable: false,
  disableGlobalFilter: false,
  disableResizing: true,
  width: 35,
  maxWidth: 35,
  minWidth: 35,
  id: 'btn-edit',
  Cell: getExpandCell({
    title: gettext('View details')
  }),
},
{
  accessor: 'pid',
  Header: gettext('PID'),
  sortable: true,
  resizable: true,
  disableGlobalFilter: false,
  minWidth: 26,
  width: 40,
},
{
  accessor: 'client_addr',
  Header: gettext('Client Addr'),
  sortable: true,
  resizable: true,
  disableGlobalFilter: false,
  minWidth: 26,
  width: 60,
},
{
  accessor:'state',
  Header: gettext('State'),
  sortable: true,
  resizable: true,
  disableGlobalFilter: false,
  minWidth: 26,
  width: 60
},
{
  accessor:'write_lag',
  Header: gettext('Write Lag'),
  sortable: true,
  resizable: true,
  disableGlobalFilter: false,
  minWidth: 26,
  width: 60
},
{
  accessor:'flush_lag',
  Header: gettext('Flush Lag'),
  sortable: true,
  resizable: true,
  disableGlobalFilter: false,
  minWidth: 26,
  width: 60
},
{
  accessor:'replay_lag',
  Header: gettext('Replay Lag'),
  sortable: true,
  resizable: true,
  disableGlobalFilter: false,
  minWidth: 26,
  width: 60
},
{
  accessor:'reply_time',
  Header: gettext('Reply Time'),
  sortable: true,
  resizable: true,
  disableGlobalFilter: false,
  minWidth: 26,
  width: 80
}
];

const replicationSlotsColumns = [{
  accessor: 'view_details',
  Header: () => null,
  sortable: false,
  resizable: false,
  disableGlobalFilter: false,
  disableResizing: true,
  width: 35,
  maxWidth: 35,
  minWidth: 35,
  id: 'btn-details',
  Cell: getExpandCell({
    title: gettext('View details')
  }),
},
{
  accessor: 'active_pid',
  Header: gettext('Active PID'),
  sortable: true,
  resizable: true,
  disableGlobalFilter: false,
  minWidth: 26,
  width: 50,
},
{
  accessor: 'slot_name',
  Header: gettext('Slot Name'),
  sortable: true,
  resizable: true,
  disableGlobalFilter: false,
  minWidth: 26,
  width: 200,
},
{
  accessor:'active',
  Header: gettext('Active'),
  sortable: true,
  resizable: true,
  disableGlobalFilter: false,
  minWidth: 26,
  width: 60,
  Cell: getSwitchCell(),
}
];

const replSchemaObj = new ReplicationSlotsSchema();
const replStatObj = new ReplicationStatsSchema();

export default function Replication({treeNodeInfo, pageVisible}) {
  const [replicationSlots, setReplicationSlots] = useState([{
  }]);
  const [replicationStats, setReplicationStats] = useState([{
  }]);
  const pgAdmin = usePgAdmin();

  const getReplicationData = (endpoint, setter)=>{
    const api = getApiInstance();
    const url = url_for(`dashboard.${endpoint}`, {sid: treeNodeInfo.server._id});
    api.get(url)
      .then((res)=>{
        setter(res.data);
      })
      .catch((error)=>{
        console.error(error);
        pgAdmin.Browser.notifier.error(parseApiError(error));
      });
  };

  useEffect(()=>{
    if(pageVisible) {
      getReplicationData('replication_stats', setReplicationStats);
      getReplicationData('replication_slots', setReplicationSlots);
    }
  }, [pageVisible ]);

  return (
    <Box height="100%" display="flex" flexDirection="column">
      <SectionContainer
        titleExtras={<RefreshButton onClick={()=>{
          getReplicationData('replication_stats', setReplicationStats);
        }}/>}
        title={gettext('Replication Stats')} style={{minHeight: '300px'}}>
        <PgTable
          caveTable={false}
          columns={replicationStatsColumns}
          data={replicationStats}
          schema={replStatObj}
        ></PgTable>
      </SectionContainer>
      <SectionContainer
        titleExtras={<RefreshButton onClick={()=>{
          getReplicationData('replication_slots', setReplicationSlots);
        }}/>}
        title={gettext('Replication Slots')} style={{minHeight: '300px', marginTop: '4px'}}>
        <PgTable
          caveTable={false}
          columns={replicationSlotsColumns}
          data={replicationSlots}
          schema={replSchemaObj}
        ></PgTable>
      </SectionContainer>
    </Box>
  );
}

Replication.propTypes = {
  treeNodeInfo: PropTypes.object.isRequired,
  pageVisible: PropTypes.bool,
};
