/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Box, Grid, useTheme } from '@mui/material';
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';

import gettext from 'sources/gettext';
import PgTable from 'sources/components/PgTable';
import getApiInstance, { parseApiError } from '../../../../static/js/api_instance';
import SectionContainer from '../components/SectionContainer';
import RefreshButton from '../components/RefreshButtons';
import { getExpandCell, getSwitchCell } from '../../../../static/js/components/PgReactTableStyled';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';
import url_for from 'sources/url_for';
import PropTypes from 'prop-types';
import PGDOutgoingSchema from './schema_ui/pgd_outgoing.ui';
import PGDIncomingSchema from './schema_ui/pgd_incoming.ui';
import ChartContainer from '../components/ChartContainer';
import StreamingChart from '../../../../static/js/components/PgChart/StreamingChart';
import { DATA_POINT_SIZE } from '../../../../static/js/chartjs';
import { X_AXIS_LENGTH, statsReducer, transformData } from '../Graphs';
import { getEpoch, getGCD, toPrettySize } from '../../../../static/js/utils';
import { useInterval, usePrevious } from '../../../../static/js/custom_hooks';


const outgoingReplicationColumns = [{
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
  accessorKey: 'active_pid',
  header: gettext('Active PID'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 40,
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
  accessorKey: 'slot_name',
  header: gettext('Slot'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60
},
{
  accessorKey: 'write_lag',
  header: gettext('Write lag'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60
},
{
  accessorKey: 'flush_lag',
  header: gettext('Flush lag'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60
},
{
  accessorKey: 'replay_lag',
  header: gettext('Replay lag'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60
},
];

const incomingReplicationColumns = [{
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
  accessorKey: 'sub_name',
  header: gettext('Subscription'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 50,
},
{
  accessorKey: 'sub_slot_name',
  header: gettext('Slot name'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 200,
},
{
  accessorKey: 'subscription_status',
  header: gettext('Status'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60,
},
{
  accessorKey: 'last_xact_replay_timestamp',
  header: gettext('Replay timestamp'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60,
}
];


const clusterNodeColumns = [{
  accessorKey: 'node_name',
  header: gettext('Node'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60,
},
{
  accessorKey: 'node_group_name',
  header: gettext('Group'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60,
},
{
  accessorKey: 'peer_state_name',
  header: gettext('Peer state'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 40,
},
{
  accessorKey: 'node_kind_name',
  header: gettext('Kind'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 40,
},
{
  accessorKey: 'pg_version',
  header: gettext('PostgreSQL version'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 80,
},
{
  accessorKey: 'bdr_version',
  header: gettext('BDR version'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 30,
},
{
  accessorKey: 'catchup_state_name',
  header: gettext('Catchup state'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 90,
}
];

const raftStatusColumns = [{
  accessorKey: 'node_name',
  header: gettext('Node'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60,
},
{
  accessorKey: 'node_group_name',
  header: gettext('Group'),
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
  size: 60,
},
{
  accessorKey: 'leader_type',
  header: gettext('Leader type'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60,
},
{
  accessorKey: 'leader_name',
  header: gettext('Leader'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60,
},
{
  accessorKey: 'voting',
  header: gettext('Voting?'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 40,
  cell: getSwitchCell(),
},
{
  accessorKey: 'voting_for',
  header: gettext('Voting for'),
  enableSorting: true,
  enableResizing: true,
  minSize: 26,
  size: 60,
}
];

const outgoingSchemaObj = new PGDOutgoingSchema();
const incomingSchemaObj = new PGDIncomingSchema();

function getChartsUrl(sid=-1, chart_names=[]) {
  let base_url = url_for('dashboard.pgd.charts', {sid: sid});
  base_url += '?chart_names=' + chart_names.join(',');
  return base_url;
}

const chartsDefault = {
  'pgd_replication_lag': {},
};

export default function PGDReplication({preferences, treeNodeInfo, pageVisible, enablePoll=true, ...props}) {
  const api = getApiInstance();
  const refreshOn = useRef(null);
  const theme = useTheme();
  const prevPreferences = usePrevious(preferences);
  const [pollDelay, setPollDelay] = useState(5000);

  const [replicationLagTime, replicationLagTimeReduce] = useReducer(statsReducer, chartsDefault['pgd_replication_lag']);
  const [replicationLagBytes, replicationLagBytesReduce] = useReducer(statsReducer, chartsDefault['pgd_replication_lag']);
  const [clusterNodes, setClusterNodes] = useState([]);
  const [raftStatus, setRaftStatus] = useState([]);
  const [outgoingReplication, setOutgoingReplication] = useState([]);
  const [incomingReplication, setIncomingReplication] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const pgAdmin = usePgAdmin();

  const sid = treeNodeInfo.server._id;

  const options = useMemo(()=>({
    showDataPoints: preferences['graph_data_points'],
    showTooltip: preferences['graph_mouse_track'],
    lineBorderSize: preferences['graph_line_border_width'],
  }), [preferences]);

  const getReplicationData = (endpoint, setter)=>{
    const url = url_for(`dashboard.pgd.${endpoint}`, {sid: sid});
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
    let calcPollDelay = false;
    if(prevPreferences) {
      if(prevPreferences['pgd_replication_lag_refresh'] != preferences['pgd_replication_lag_refresh']) {
        replicationLagTimeReduce({reset: chartsDefault['pgd_replication_lag']});
        replicationLagBytesReduce({reset: chartsDefault['pgd_replication_lag']});
        calcPollDelay = true;
      }
    } else {
      calcPollDelay = true;
    }
    if(calcPollDelay) {
      const keys = Object.keys(chartsDefault);
      const length = keys.length;
      if(length == 1){
        setPollDelay(
          preferences[keys[0]+'_refresh']*1000
        );
      } else {
        setPollDelay(
          getGCD(Object.keys(chartsDefault).map((name)=>preferences[name+'_refresh']))*1000
        );
      }
    }
  }, [preferences]);

  useEffect(()=>{
    if(pageVisible) {
      getReplicationData('cluster_nodes', setClusterNodes);
      getReplicationData('raft_status', setRaftStatus);
      getReplicationData('outgoing', setOutgoingReplication);
      getReplicationData('incoming', setIncomingReplication);
    }
  }, [pageVisible]);

  useInterval(()=>{
    const currEpoch = getEpoch();
    if(refreshOn.current === null) {
      let tmpRef = {};
      Object.keys(chartsDefault).forEach((name)=>{
        tmpRef[name] = currEpoch;
      });
      refreshOn.current = tmpRef;
    }

    let getFor = [];
    Object.keys(chartsDefault).forEach((name)=>{
      if(currEpoch >= refreshOn.current[name]) {
        getFor.push(name);
        refreshOn.current[name] = currEpoch + preferences[name+'_refresh'];
      }
    });

    let path = getChartsUrl(sid, getFor);
    if (!pageVisible){
      return;
    }

    api.get(path)
      .then((resp)=>{
        let data = resp.data;
        setErrorMsg(null);
        if(data.hasOwnProperty('pgd_replication_lag')){
          let newTime = {};
          let newBytes = {};
          for(const row of data['pgd_replication_lag']) {
            newTime[row['name']] = row['replay_lag'] ?? 0;
            newBytes[row['name']] = row['replay_lag_bytes'] ?? 0;
          }
          replicationLagTimeReduce({incoming: newTime});
          replicationLagBytesReduce({incoming: newBytes});
        }
      })
      .catch((error)=>{
        if(!errorMsg) {
          replicationLagTimeReduce({reset: chartsDefault['pgd_replication_lag']});
          replicationLagBytesReduce({reset: chartsDefault['pgd_replication_lag']});
          if(error.response) {
            if (error.response.status === 428) {
              setErrorMsg(gettext('Please connect to the selected server to view the graph.'));
            } else {
              setErrorMsg(gettext('An error occurred whilst rendering the graph.'));
            }
          } else if(error.request) {
            setErrorMsg(gettext('Not connected to the server or the connection to the server has been closed.'));
            return;
          } else {
            console.error(error);
          }
        }
      });
  }, enablePoll ? pollDelay : -1);

  const replicationLagTimeData = useMemo(()=>transformData(replicationLagTime, preferences['pgd_replication_lag_refresh'], theme.name), [replicationLagTime, theme.name]);
  const replicationLagBytesData = useMemo(()=>transformData(replicationLagBytes, preferences['pgd_replication_lag_refresh'], theme.name), [replicationLagBytes, theme.name]);

  return (
    <Box height="100%" display="flex" flexDirection="column">
      <Grid container spacing={0.5}>
        <Grid item md={6}>
          <ChartContainer id='sessions-graph' title={gettext('Replication lag (Time)')}
            datasets={replicationLagTimeData.datasets} errorMsg={errorMsg} isTest={props.isTest}>
            <StreamingChart data={replicationLagTimeData} dataPointSize={DATA_POINT_SIZE} xRange={X_AXIS_LENGTH} options={options}
              valueFormatter={(v)=>toPrettySize(v, 's')} />
          </ChartContainer>
        </Grid>
        <Grid item md={6}>
          <ChartContainer id='tps-graph' title={gettext('Replication lag (Size)')} datasets={replicationLagBytesData.datasets} errorMsg={errorMsg} isTest={props.isTest}>
            <StreamingChart data={replicationLagBytesData} dataPointSize={DATA_POINT_SIZE} xRange={X_AXIS_LENGTH} options={options}
              valueFormatter={toPrettySize} />
          </ChartContainer>
        </Grid>
      </Grid>
      <SectionContainer
        titleExtras={<RefreshButton onClick={()=>{
          getReplicationData('cluster_nodes', setClusterNodes);
        }}/>}
        title={gettext('Cluster nodes')} style={{minHeight: '300px', marginTop: '4px'}}>
        <PgTable
          caveTable={false}
          tableNoBorder={false}
          columns={clusterNodeColumns}
          data={clusterNodes}
        ></PgTable>
      </SectionContainer>
      <SectionContainer
        titleExtras={<RefreshButton onClick={()=>{
          getReplicationData('raft_status', setRaftStatus);
        }}/>}
        title={gettext('Raft status')} style={{minHeight: '300px', marginTop: '4px'}}>
        <PgTable
          caveTable={false}
          tableNoBorder={false}
          columns={raftStatusColumns}
          data={raftStatus}
        ></PgTable>
      </SectionContainer>
      <SectionContainer
        titleExtras={<RefreshButton onClick={()=>{
          getReplicationData('outgoing', setOutgoingReplication);
        }}/>}
        title={gettext('Outgoing Replication')} style={{minHeight: '300px', marginTop: '4px'}}>
        <PgTable
          caveTable={false}
          tableNoBorder={false}
          columns={outgoingReplicationColumns}
          data={outgoingReplication}
          schema={outgoingSchemaObj}
        ></PgTable>
      </SectionContainer>
      <SectionContainer
        titleExtras={<RefreshButton onClick={()=>{
          getReplicationData('incoming', setIncomingReplication);
        }}/>}
        title={gettext('Incoming Replication')} style={{minHeight: '300px', marginTop: '4px'}}>
        <PgTable
          caveTable={false}
          tableNoBorder={false}
          columns={incomingReplicationColumns}
          data={incomingReplication}
          schema={incomingSchemaObj}
        ></PgTable>
      </SectionContainer>
    </Box>
  );
}

PGDReplication.propTypes = {
  preferences: PropTypes.object,
  treeNodeInfo: PropTypes.object.isRequired,
  pageVisible: PropTypes.bool,
  enablePoll: PropTypes.bool,
  isTest: PropTypes.bool,
};
