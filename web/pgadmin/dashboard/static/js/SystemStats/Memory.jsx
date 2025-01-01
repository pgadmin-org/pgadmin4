/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useState, useEffect, useRef, useReducer, useMemo } from 'react';
import PgTable from 'sources/components/PgTable';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import {getGCD, getEpoch} from 'sources/utils';
import ChartContainer from '../components/ChartContainer';
import { Box, Grid } from '@mui/material';
import { DATA_POINT_SIZE } from 'sources/chartjs';
import StreamingChart from '../../../../static/js/components/PgChart/StreamingChart';
import {useInterval, usePrevious} from 'sources/custom_hooks';
import axios from 'axios';
import { getStatsUrl, transformData, statsReducer, X_AXIS_LENGTH } from './utility.js';
import { toPrettySize } from '../../../../static/js/utils';
import SectionContainer from '../components/SectionContainer.jsx';


const chartsDefault = {
  'm_stats': {'Total': [], 'Used': [], 'Free': []},
  'sm_stats': {'Total': [], 'Used': [], 'Free': []},
  'pmu_stats': {},
};

export default function Memory({preferences, sid, did, pageVisible, enablePoll=true}) {
  const refreshOn = useRef(null);
  const prevPrefernces = usePrevious(preferences);

  const [memoryUsageInfo, memoryUsageInfoReduce] = useReducer(statsReducer, chartsDefault['m_stats']);
  const [swapMemoryUsageInfo, swapMemoryUsageInfoReduce] = useReducer(statsReducer, chartsDefault['sm_stats']);
  const [processMemoryUsageStats, setProcessMemoryUsageStats] = useState([]);

  const [pollDelay, setPollDelay] = useState(5000);
  const [errorMsg, setErrorMsg] = useState(null);
  const [chartDrawnOnce, setChartDrawnOnce] = useState(false);

  const tableHeader = [
    {
      header: gettext('PID'),
      accessorKey: 'pid',
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
    {
      header: gettext('Name'),
      accessorKey: 'name',
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
    {
      header: gettext('Memory usage'),
      accessorKey: 'memory_usage',
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
    {
      header: gettext('Memory bytes'),
      accessorKey: 'memory_bytes',
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
  ];

  useEffect(()=>{
    let calcPollDelay = false;
    if(prevPrefernces) {
      if(prevPrefernces['m_stats_refresh'] != preferences['m_stats_refresh']) {
        memoryUsageInfoReduce({reset: chartsDefault['m_stats']});
        calcPollDelay = true;
      }
      if(prevPrefernces['sm_stats_refresh'] != preferences['sm_stats_refresh']) {
        swapMemoryUsageInfoReduce({reset: chartsDefault['sm_stats']});
        calcPollDelay = true;
      }
      if(prevPrefernces['pmu_stats_refresh'] != preferences['pmu_stats_refresh']) {
        setProcessMemoryUsageStats([]);
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
    /* Charts rendered are not visible when, the dashboard is hidden but later visible */
    if(pageVisible && !chartDrawnOnce) {
      setChartDrawnOnce(true);
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

    let path = getStatsUrl(sid, did, getFor);
    if (!pageVisible){
      return;
    }
    axios.get(path)
      .then((resp)=>{
        let data = resp.data;
        setErrorMsg(null);
        if(data.hasOwnProperty('m_stats')){
          let new_m_stats = {
            'Total': data['m_stats']['total_memory']?data['m_stats']['total_memory']:0,
            'Used': data['m_stats']['used_memory']?data['m_stats']['used_memory']:0,
            'Free': data['m_stats']['free_memory']?data['m_stats']['free_memory']:0,
          };
          memoryUsageInfoReduce({incoming: new_m_stats});
        }

        if(data.hasOwnProperty('sm_stats')){
          let new_sm_stats = {
            'Total': data['sm_stats']['swap_total']?data['sm_stats']['swap_total']:0,
            'Used': data['sm_stats']['swap_used']?data['sm_stats']['swap_used']:0,
            'Free': data['sm_stats']['swap_free']?data['sm_stats']['swap_free']:0,
          };
          swapMemoryUsageInfoReduce({incoming: new_sm_stats});
        }

        if(data.hasOwnProperty('pmu_stats')){
          let pmu_info_list = [];
          const pmu_info_obj = data['pmu_stats'];
          for (const key in pmu_info_obj) {
            pmu_info_list.push({ icon: '', pid: pmu_info_obj[key]['pid'], name: gettext(pmu_info_obj[key]['name']), memory_usage: gettext(toPrettySize(pmu_info_obj[key]['memory_usage'])), memory_bytes: gettext(toPrettySize(pmu_info_obj[key]['memory_bytes'])) });
          }

          setProcessMemoryUsageStats(pmu_info_list);
        }
      })
      .catch((error)=>{
        if(!errorMsg) {
          memoryUsageInfoReduce({reset:chartsDefault['m_stats']});
          swapMemoryUsageInfoReduce({reset:chartsDefault['sm_stats']});
          setProcessMemoryUsageStats([]);
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
  return (
    <Box display="flex" flexDirection="column" height="100%">
      <div data-testid='graph-poll-delay' style={{display: 'none'}}>{pollDelay}</div>
      {chartDrawnOnce &&
        <MemoryWrapper
          memoryUsageInfo={transformData(memoryUsageInfo, preferences['m_stats_refresh'])}
          swapMemoryUsageInfo={transformData(swapMemoryUsageInfo, preferences['sm_stats_refresh'])}
          processMemoryUsageStats={processMemoryUsageStats}
          tableHeader={tableHeader}
          errorMsg={errorMsg}
          showTooltip={preferences['graph_mouse_track']}
          showDataPoints={preferences['graph_data_points']}
          lineBorderWidth={preferences['graph_line_border_width']}
          isTest={false}
        />
      }
    </Box>
  );
}

Memory.propTypes = {
  preferences: PropTypes.object.isRequired,
  sid: PropTypes.oneOfType([PropTypes.string.isRequired, PropTypes.number.isRequired]),
  did: PropTypes.oneOfType([PropTypes.string.isRequired, PropTypes.number.isRequired]),
  pageVisible: PropTypes.bool,
  enablePoll: PropTypes.bool,
};

export function MemoryWrapper(props) {

  const options = useMemo(()=>({
    showDataPoints: props.showDataPoints,
    showTooltip: props.showTooltip,
    lineBorderWidth: props.lineBorderWidth,
  }), [props.showTooltip, props.showDataPoints, props.lineBorderWidth]);

  return (
    (
      <Box display="flex" flexDirection="column" height="100%">
        <Grid container spacing={0.5} sx={{marginBottom: '4px'}}>
          <Grid item md={6}>
            <ChartContainer id='m-graph' title={gettext('Memory')} datasets={props.memoryUsageInfo.datasets}  errorMsg={props.errorMsg} isTest={props.isTest}>
              <StreamingChart data={props.memoryUsageInfo} dataPointSize={DATA_POINT_SIZE} xRange={X_AXIS_LENGTH} options={options}
                valueFormatter={toPrettySize}/>
            </ChartContainer>
          </Grid>
          <Grid item md={6}>
            <ChartContainer id='sm-graph' title={gettext('Swap memory')} datasets={props.swapMemoryUsageInfo.datasets}  errorMsg={props.errorMsg} isTest={props.isTest}>
              <StreamingChart data={props.swapMemoryUsageInfo} dataPointSize={DATA_POINT_SIZE} xRange={X_AXIS_LENGTH} options={options}
                valueFormatter={toPrettySize}/>
            </ChartContainer>
          </Grid>
        </Grid>
        <Box flexGrow={1} minHeight={0}>
          <SectionContainer title={gettext('Process memory usage')}>
            <PgTable
              columns={props.tableHeader}
              data={props.processMemoryUsageStats}
              msg={props.errorMsg}
              type={'panel'}
              caveTable={false}
              tableNoBorder={false}
            ></PgTable>
          </SectionContainer>
        </Box>
      </Box>
    )
  );
}

const propTypeStats = PropTypes.shape({
  datasets: PropTypes.array,
  refreshRate: PropTypes.number.isRequired,
});
MemoryWrapper.propTypes = {
  memoryUsageInfo: propTypeStats.isRequired,
  swapMemoryUsageInfo: propTypeStats.isRequired,
  processMemoryUsageStats: PropTypes.array.isRequired,
  tableHeader: PropTypes.array.isRequired,
  errorMsg: PropTypes.string,
  showTooltip: PropTypes.bool.isRequired,
  showDataPoints: PropTypes.bool.isRequired,
  lineBorderWidth: PropTypes.number.isRequired,
  isTest: PropTypes.bool,
};
