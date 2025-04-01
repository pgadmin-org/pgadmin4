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
import ChartContainer from '../components/ChartContainer.jsx';
import { Box, Grid } from '@mui/material';
import { DATA_POINT_SIZE } from 'sources/chartjs';
import StreamingChart from '../../../../static/js/components/PgChart/StreamingChart.jsx';
import {useInterval, usePrevious} from 'sources/custom_hooks';
import axios from 'axios';
import { getStatsUrl, transformData, statsReducer, X_AXIS_LENGTH } from './utility.js';
import { toPrettySize } from '../../../../static/js/utils.js';
import SectionContainer from '../components/SectionContainer.jsx';

const chartsDefault = {
  'cpu_stats': {'User Normal': [], 'User Niced': [], 'Kernel': [], 'Idle': []},
  'la_stats': {'1 min': [], '5 mins': [], '10 mins': [], '15 mins': []},
  'pcpu_stats': {},
};

export default function CpuDetails({preferences, sid, did, pageVisible, enablePoll=true}) {
  const refreshOn = useRef(null);
  const prevPrefernces = usePrevious(preferences);

  const [cpuUsageInfo, cpuUsageInfoReduce] = useReducer(statsReducer, chartsDefault['cpu_stats']);
  const [loadAvgInfo, loadAvgInfoReduce] = useReducer(statsReducer, chartsDefault['la_stats']);
  const [processCpuUsageStats, setProcessCpuUsageStats] = useState([]);

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
      header: gettext('CPU usage'),
      accessorKey: 'cpu_usage',
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
  ];

  useEffect(()=>{
    let calcPollDelay = false;
    if(prevPrefernces) {
      if(prevPrefernces['cpu_stats_refresh'] != preferences['cpu_stats_refresh']) {
        cpuUsageInfoReduce({reset: chartsDefault['cpu_stats']});
        calcPollDelay = true;
      }
      if(prevPrefernces['la_stats_refresh'] != preferences['la_stats_refresh']) {
        loadAvgInfoReduce({reset: chartsDefault['la_stats']});
        calcPollDelay = true;
      }
      if(prevPrefernces['pcpu_stats_refresh'] != preferences['pcpu_stats_refresh']) {
        setProcessCpuUsageStats([]);
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
        if(data.hasOwnProperty('cpu_stats')){
          let new_cu_stats = {
            'User Normal': data['cpu_stats']['usermode_normal_process_percent'] ?? 0,
            'User Niced': data['cpu_stats']['usermode_niced_process_percent'] ?? 0,
            'Kernel': data['cpu_stats']['kernelmode_process_percent'] ?? 0,
            'Idle': data['cpu_stats']['idle_mode_percent'] ?? 0,
          };
          cpuUsageInfoReduce({incoming: new_cu_stats});
        }

        if(data.hasOwnProperty('la_stats')){
          let new_la_stats = {
            '1 min': data['la_stats']['load_avg_one_minute']?data['la_stats']['load_avg_one_minute']:0,
            '5 mins': data['la_stats']['load_avg_five_minutes']?data['la_stats']['load_avg_five_minutes']:0,
            '10 mins': data['la_stats']['load_avg_ten_minutes']?data['la_stats']['load_avg_ten_minutes']:0,
            '15 mins': data['la_stats']['load_avg_fifteen_minutes']?data['la_stats']['load_avg_fifteen_minutes']:0,
          };
          loadAvgInfoReduce({incoming: new_la_stats});
        }

        if(data.hasOwnProperty('pcpu_stats')){
          let pcu_info_list = [];
          const pcu_info_obj = data['pcpu_stats'];
          for (const key in pcu_info_obj) {
            pcu_info_list.push({ icon: '', pid: pcu_info_obj[key]['pid'], name: gettext(pcu_info_obj[key]['name']), cpu_usage: gettext(toPrettySize(pcu_info_obj[key]['cpu_usage'])) });
          }

          setProcessCpuUsageStats(pcu_info_list);
        }
      })
      .catch((error)=>{
        if(!errorMsg) {
          cpuUsageInfoReduce({reset:chartsDefault['cpu_stats']});
          loadAvgInfoReduce({reset:chartsDefault['la_stats']});
          setProcessCpuUsageStats([]);
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
        <CPUWrapper
          cpuUsageInfo={transformData(cpuUsageInfo, preferences['cpu_stats_refresh'])}
          loadAvgInfo={transformData(loadAvgInfo, preferences['la_stats_refresh'])}
          processCpuUsageStats={processCpuUsageStats}
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

CpuDetails.propTypes = {
  preferences: PropTypes.object.isRequired,
  sid: PropTypes.oneOfType([PropTypes.string.isRequired, PropTypes.number.isRequired]),
  did: PropTypes.oneOfType([PropTypes.string.isRequired, PropTypes.number.isRequired]),
  pageVisible: PropTypes.bool,
  enablePoll: PropTypes.bool,
};

export function CPUWrapper(props) {
  const options = useMemo(()=>({
    showDataPoints: props.showDataPoints,
    showTooltip: props.showTooltip,
    lineBorderWidth: props.lineBorderWidth,
  }), [props.showTooltip, props.showDataPoints, props.lineBorderWidth]);
  return (
    (<Box display="flex" flexDirection="column" height="100%">
      <Grid container spacing={0.5} sx={{marginBottom: '4px'}}>
        <Grid item md={6}>
          <ChartContainer id='cu-graph' title={gettext('CPU usage')} datasets={props.cpuUsageInfo.datasets}  errorMsg={props.errorMsg} isTest={props.isTest}>
            <StreamingChart data={props.cpuUsageInfo} dataPointSize={DATA_POINT_SIZE} xRange={X_AXIS_LENGTH} options={options} />
          </ChartContainer>
        </Grid>
        <Grid item md={6} >
          <ChartContainer id='la-graph' title={gettext('Load average')} datasets={props.loadAvgInfo.datasets}  errorMsg={props.errorMsg} isTest={props.isTest}>
            <StreamingChart data={props.loadAvgInfo} dataPointSize={DATA_POINT_SIZE} xRange={X_AXIS_LENGTH} options={options} />
          </ChartContainer>
        </Grid>
      </Grid>
      <Box flexGrow={1} minHeight={0}>
        <SectionContainer title={gettext('Process CPU usage')}>
          <PgTable
            columns={props.tableHeader}
            data={props.processCpuUsageStats}
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
CPUWrapper.propTypes = {
  cpuUsageInfo: propTypeStats.isRequired,
  loadAvgInfo: propTypeStats.isRequired,
  processCpuUsageStats: PropTypes.array.isRequired,
  tableHeader: PropTypes.array.isRequired,
  errorMsg: PropTypes.string,
  showTooltip: PropTypes.bool.isRequired,
  showDataPoints: PropTypes.bool.isRequired,
  lineBorderWidth: PropTypes.number.isRequired,
  isTest: PropTypes.bool,
};
