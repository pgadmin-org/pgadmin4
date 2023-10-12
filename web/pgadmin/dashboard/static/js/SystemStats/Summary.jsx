/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useState, useEffect, useRef, useReducer, useMemo } from 'react';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import url_for from 'sources/url_for';
import getApiInstance from 'sources/api_instance';
import {getGCD, getEpoch} from 'sources/utils';
import {ChartContainer} from '../Dashboard';
import { Grid } from '@material-ui/core';
import { DATA_POINT_SIZE } from 'sources/chartjs';
import StreamingChart from '../../../../static/js/components/PgChart/StreamingChart';
import {useInterval, usePrevious} from 'sources/custom_hooks';
import axios from 'axios';
import { getStatsUrl, transformData,statsReducer, X_AXIS_LENGTH } from './utility.js';
import clsx from 'clsx';
import { commonTableStyles } from '../../../../static/js/Theme';

const useStyles = makeStyles((theme) => ({
  container: {
    height: 'auto',
    padding: '0px !important',
    marginBottom: '4px',
  },
  tableContainer: {
    background: theme.otherVars.tableBg,
    padding: '0px',
    border: '1px solid '+theme.otherVars.borderColor,
    borderCollapse: 'collapse',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  chartContainer: {
    padding: '4px',
  },
  containerHeader: {
    fontWeight: 'bold',
    marginBottom: '0px',
    borderBottom: '1px solid '+theme.otherVars.borderColor,
    padding: '4px 8px',
  },
}));

const chartsDefault = {
  'hpc_stats': {'Process': [], 'Handle': []},
};

const SummaryTable = (props) => {
  const tableClasses = commonTableStyles();
  const data = props.data;
  return (
    <table className={clsx(tableClasses.table)}>
      <thead>
        <tr>
          <th>Property</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index}>
            <td>{item.name}</td>
            <td>{item.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

SummaryTable.propTypes = {
  data: PropTypes.any,
};

export default function Summary({preferences, sid, did, pageVisible, enablePoll=true}) {
  const refreshOn = useRef(null);
  const prevPrefernces = usePrevious(preferences);

  const [processHandleCount, processHandleCountReduce] = useReducer(statsReducer, chartsDefault['hpc_stats']);
  const [osStats, setOsStats] = useState([]);
  const [cpuStats, setCpuStats] = useState([]);

  const [, setCounterData] = useState({});
  const [pollDelay, setPollDelay] = useState(5000);
  const [errorMsg, setErrorMsg] = useState(null);
  const [chartDrawnOnce, setChartDrawnOnce] = useState(false);

  const tableHeader = [
    {
      Header: gettext('Property'),
      accessor: 'name',
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
    {
      Header: gettext('Value'),
      accessor: 'value',
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
  ];

  useEffect(()=>{
    let calcPollDelay = false;
    if(prevPrefernces) {
      if(prevPrefernces['hpc_stats_refresh'] != preferences['hpc_stats_refresh']) {
        processHandleCountReduce({reset: chartsDefault['hpc_stats']});
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

  useEffect(() => {
    try {
      // Fetch the latest data point from the API endpoint
      let url;
      url = url_for('dashboard.system_statistics');
      url += '/' + sid;
      url += did > 0 ? '/' + did : '';
      url += '?chart_names=' + 'pg_sys_os_info,pg_sys_cpu_info';
      const api = getApiInstance();
      api({
        url: url,
        type: 'GET',
      })
        .then((res) => {
          let data = res.data;

          const os_info_obj = data['pg_sys_os_info'];
          let os_info_list = [
            { icon: '', name: gettext('Name'), value: gettext(os_info_obj['name']) },
            { icon: '', name: gettext('Version'), value: gettext(os_info_obj['version']) },
            { icon: '', name: gettext('Host name'), value: gettext(os_info_obj['host_name']) },
            { icon: '', name: gettext('Domain name'), value: gettext(os_info_obj['domain_name']) },
            { icon: '', name: gettext('Architecture'), value: gettext(os_info_obj['architecture']) },
            { icon: '', name: gettext('Os up since seconds'), value: gettext(os_info_obj['os_up_since_seconds']) },
          ];
          setOsStats(os_info_list);

          const cpu_info_obj = data['pg_sys_cpu_info'];
          let cpu_info_list = [
            { icon: '', name: gettext('Vendor'), value: gettext(cpu_info_obj['vendor']) },
            { icon: '', name: gettext('Description'), value: gettext(cpu_info_obj['description']) },
            { icon: '', name: gettext('Model name'), value: gettext(cpu_info_obj['model_name']) },
            { icon: '', name: gettext('No of cores'), value: gettext(cpu_info_obj['no_of_cores']) },
            { icon: '', name: gettext('Architecture'), value: gettext(cpu_info_obj['architecture']) },
            { icon: '', name: gettext('Clock speed Hz'), value: gettext(cpu_info_obj['clock_speed_hz']) },
            { icon: '', name: gettext('L1 dcache size'), value: gettext(cpu_info_obj['l1dcache_size']) },
            { icon: '', name: gettext('L1 icache size'), value: gettext(cpu_info_obj['l1icache_size']) },
            { icon: '', name: gettext('L2 cache size'), value: gettext(cpu_info_obj['l2cache_size']) },
            { icon: '', name: gettext('L3 cache size'), value: gettext(cpu_info_obj['l3cache_size']) },
          ];
          setCpuStats(cpu_info_list);

          setErrorMsg(null);
        })
        .catch((error) => {
          console.error('Error fetching data:', error);
        });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [sid, did, enablePoll, pageVisible]);

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
        processHandleCountReduce({incoming: data['hpc_stats']});

        setCounterData((prevCounterData)=>{
          return {
            ...prevCounterData,
            ...data,
          };
        });
      })
      .catch((error)=>{
        if(!errorMsg) {
          processHandleCountReduce({reset:chartsDefault['hpc_stats']});
          setCounterData({});
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
    <>
      <div data-testid='graph-poll-delay' style={{display: 'none'}}>{pollDelay}</div>
      {chartDrawnOnce &&
        <SummaryWrapper
          processHandleCount={transformData(processHandleCount, preferences['hpc_stats_refresh'])}
          osStats={osStats}
          cpuStats={cpuStats}
          tableHeader={tableHeader}
          errorMsg={errorMsg}
          showTooltip={preferences['graph_mouse_track']}
          showDataPoints={preferences['graph_data_points']}
          lineBorderWidth={preferences['graph_line_border_width']}
          isDatabase={did > 0}
          isTest={false}
        />
      }
    </>
  );
}

Summary.propTypes = {
  preferences: PropTypes.object.isRequired,
  sid: PropTypes.oneOfType([PropTypes.string.isRequired, PropTypes.number.isRequired]),
  did: PropTypes.oneOfType([PropTypes.string.isRequired, PropTypes.number.isRequired]),
  pageVisible: PropTypes.bool,
  enablePoll: PropTypes.bool,
};

export function SummaryWrapper(props) {
  const classes = useStyles();
  const options = useMemo(()=>({
    showDataPoints: props.showDataPoints,
    showTooltip: props.showTooltip,
    lineBorderWidth: props.lineBorderWidth,
  }), [props.showTooltip, props.showDataPoints, props.lineBorderWidth]);
  return (
    <>
      <Grid container spacing={1} className={classes.container}>
        <Grid item md={6} sm={12}>
          <div className={classes.tableContainer}>
            <div className={classes.containerHeader}>{gettext('OS information')}</div>
            <SummaryTable data={props.osStats} />
          </div>
        </Grid>
        <Grid item md={6} sm={12} className={classes.chartContainer}>
          <ChartContainer id='hpc-graph' title={gettext('Process & handle count')} datasets={props.processHandleCount.datasets}  errorMsg={props.errorMsg} isTest={props.isTest}>
            <StreamingChart data={props.processHandleCount} dataPointSize={DATA_POINT_SIZE} xRange={X_AXIS_LENGTH} options={options} showSecondAxis={true} />
          </ChartContainer>
        </Grid>
      </Grid>
      <Grid container spacing={1} className={classes.container}>
        <Grid item md={6} sm={12}>
          <div className={classes.tableContainer}>
            <div className={classes.containerHeader}>{gettext('CPU information')}</div>
            <SummaryTable data={props.cpuStats} />
          </div>
        </Grid>
        <Grid item md={6} sm={12}>
        </Grid>
      </Grid>
    </>
  );
}

SummaryWrapper.propTypes = {
  processHandleCount: PropTypes.any.isRequired,
  osStats: PropTypes.any.isRequired,
  cpuStats: PropTypes.any.isRequired,
  tableHeader: PropTypes.any.isRequired,
  errorMsg: PropTypes.any,
  showTooltip: PropTypes.bool,
  showDataPoints: PropTypes.bool,
  lineBorderWidth: PropTypes.number,
  isDatabase: PropTypes.bool,
  isTest: PropTypes.bool,
};
