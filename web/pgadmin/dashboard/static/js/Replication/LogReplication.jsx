/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Box } from '@mui/material';
import React, { useEffect, useState } from 'react';

import gettext from 'sources/gettext';
import ReplicationSlotsSchema from './schema_ui/replication_slots.ui';
import PgTable from 'sources/components/PgTable';
import getApiInstance, { parseApiError } from '../../../../static/js/api_instance';
import SectionContainer from '../components/SectionContainer';
import ReplicationStatsSchema from './schema_ui/replication_stats.ui';
import RefreshButton from '../components/RefreshButtons';
import { getExpandCell, getSwitchCell } from '../../../../static/js/components/PgReactTableStyled';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';
import url_for from 'sources/url_for';
import PropTypes from 'prop-types';


const replicationStatsColumns = [{
  accessorKey: 'view_details',
  header: () => null,
  enableSorting: false,
  enableResizing: false,
  size: 35,
  maxSize: 35,
  minSize: 35,
  id: 'btn-edit',
  cell: getExpandCell({
    title: gettext('View details')
  }),
},
{
  accessorKey: 'pid',
  header: gettext('PID'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 40,
},
{
  accessorKey: 'client_addr',
  header: gettext('Client Addr'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60,
},
{
  accessorKey: 'state',
  header: gettext('State'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60
},
{
  accessorKey: 'write_lag',
  header: gettext('Write Lag'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60
},
{
  accessorKey: 'flush_lag',
  header: gettext('Flush Lag'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60
},
{
  accessorKey: 'replay_lag',
  header: gettext('Replay Lag'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60
},
{
  accessorKey: 'reply_time',
  header: gettext('Reply Time'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 80
}
];

const replicationSlotsColumns = [{
  accessorKey: 'view_details',
  header: () => null,
  enableSorting: false,
  enableResizing: false,
  size: 35,
  maxSize: 35,
  minSize: 35,
  id: 'btn-details',
  cell: getExpandCell({
    title: gettext('View details')
  }),
},
{
  accessorKey: 'active_pid',
  header: gettext('Active PID'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 50,
},
{
  accessorKey: 'slot_name',
  header: gettext('Slot Name'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 200,
},
{
  accessorKey: 'active',
  header: gettext('Active'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60,
  cell: getSwitchCell(),
}
];

const replSchemaObj = new ReplicationSlotsSchema();
const replStatObj = new ReplicationStatsSchema();

export default function LogReplication({treeNodeInfo, pageVisible}) {
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

LogReplication.propTypes = {
  treeNodeInfo: PropTypes.object.isRequired,
  pageVisible: PropTypes.bool,
};
