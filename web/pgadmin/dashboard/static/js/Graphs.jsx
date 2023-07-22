/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useEffect, useRef, useState, useReducer, useMemo } from 'react';
import { DATA_POINT_SIZE } from 'sources/chartjs';
import {ChartContainer} from './Dashboard';
import url_for from 'sources/url_for';
import axios from 'axios';
import gettext from 'sources/gettext';
import {getGCD, getEpoch} from 'sources/utils';
import {useInterval, usePrevious} from 'sources/custom_hooks';
import PropTypes from 'prop-types';
import StreamingChart from '../../../static/js/components/PgChart/StreamingChart';
import { Grid } from '@material-ui/core';

export const X_AXIS_LENGTH = 75;

/* Transform the labels data to suit ChartJS */
export function transformData(labels, refreshRate) {
  const colors = ['#00BCD4', '#9CCC65', '#E64A19'];
  let datasets = Object.keys(labels).map((label, i)=>{
    return {
      label: label,
      data: labels[label] || [],
      borderColor: colors[i],
      pointHitRadius: DATA_POINT_SIZE,
    };
  }) || [];

  return {
    datasets: datasets,
    refreshRate: refreshRate,
  };
}

/* URL for fetching graphs data */
export function getStatsUrl(sid=-1, did=-1, chart_names=[]) {
  let base_url = url_for('dashboard.dashboard_stats');
  base_url += '/' + sid;
  base_url += (did > 0) ? ('/' + did) : '';
  base_url += '?chart_names=' + chart_names.join(',');
  return base_url;
}

/* This will process incoming charts data add it the previous charts
 * data to get the new state.
 */
export function statsReducer(state, action) {

  if(action.reset) {
    return action.reset;
  }

  if(!action.incoming) {
    return state;
  }

  if(!action.counterData) {
    action.counterData = action.incoming;
  }

  let newState = {};
  Object.keys(action.incoming).forEach(label => {
    if(state[label]) {
      newState[label] = [
        action.counter ?  action.incoming[label] - action.counterData[label] : action.incoming[label],
        ...state[label].slice(0, X_AXIS_LENGTH-1),
      ];
    } else {
      newState[label] = [
        action.counter ?  action.incoming[label] - action.counterData[label] : action.incoming[label],
      ];
    }
  });
  return newState;
}

const chartsDefault = {
  'session_stats': {'Total': [], 'Active': [], 'Idle': []},
  'tps_stats': {'Transactions': [], 'Commits': [], 'Rollbacks': []},
  'ti_stats': {'Inserts': [], 'Updates': [], 'Deletes': []},
  'to_stats': {'Fetched': [], 'Returned': []},
  'bio_stats': {'Reads': [], 'Hits': []},
};

export default function Graphs({preferences, sid, did, pageVisible, enablePoll=true, isTest}) {
  const refreshOn = useRef(null);
  const prevPrefernces = usePrevious(preferences);

  const [sessionStats, sessionStatsReduce] = useReducer(statsReducer, chartsDefault['session_stats']);
  const [tpsStats, tpsStatsReduce] = useReducer(statsReducer, chartsDefault['tps_stats']);
  const [tiStats, tiStatsReduce] = useReducer(statsReducer, chartsDefault['ti_stats']);
  const [toStats, toStatsReduce] = useReducer(statsReducer, chartsDefault['to_stats']);
  const [bioStats, bioStatsReduce] = useReducer(statsReducer, chartsDefault['bio_stats']);

  const [counterData, setCounterData] = useState({});

  const [errorMsg, setErrorMsg] = useState(null);
  const [pollDelay, setPollDelay] = useState(1000);
  const [chartDrawnOnce, setChartDrawnOnce] = useState(false);

  useEffect(()=>{
    let calcPollDelay = false;
    if(prevPrefernces) {
      if(prevPrefernces['session_stats_refresh'] != preferences['session_stats_refresh']) {
        sessionStatsReduce({reset: chartsDefault['session_stats']});
        calcPollDelay = true;
      }
      if(prevPrefernces['tps_stats_refresh'] != preferences['tps_stats_refresh']) {
        tpsStatsReduce({reset:chartsDefault['tps_stats']});
        calcPollDelay = true;
      }
      if(prevPrefernces['ti_stats_refresh'] != preferences['ti_stats_refresh']) {
        tiStatsReduce({reset:chartsDefault['ti_stats']});
        calcPollDelay = true;
      }
      if(prevPrefernces['to_stats_refresh'] != preferences['to_stats_refresh']) {
        toStatsReduce({reset:chartsDefault['to_stats']});
        calcPollDelay = true;
      }
      if(prevPrefernces['bio_stats_refresh'] != preferences['bio_stats_refresh']) {
        bioStatsReduce({reset:chartsDefault['bio_stats']});
        calcPollDelay = true;
      }
    } else {
      calcPollDelay = true;
    }
    if(calcPollDelay) {
      setPollDelay(
        getGCD(Object.keys(chartsDefault).map((name)=>preferences[name+'_refresh']))*1000
      );
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
        sessionStatsReduce({incoming: data['session_stats']});
        tpsStatsReduce({incoming: data['tps_stats'], counter: true, counterData: counterData['tps_stats']});
        tiStatsReduce({incoming: data['ti_stats'], counter: true, counterData: counterData['ti_stats']});
        toStatsReduce({incoming: data['to_stats'], counter: true, counterData: counterData['to_stats']});
        bioStatsReduce({incoming: data['bio_stats'], counter: true, counterData: counterData['bio_stats']});

        setCounterData((prevCounterData)=>{
          return {
            ...prevCounterData,
            ...data,
          };
        });
      })
      .catch((error)=>{
        if(!errorMsg) {
          sessionStatsReduce({reset: chartsDefault['session_stats']});
          tpsStatsReduce({reset:chartsDefault['tps_stats']});
          tiStatsReduce({reset:chartsDefault['ti_stats']});
          toStatsReduce({reset:chartsDefault['to_stats']});
          bioStatsReduce({reset:chartsDefault['bio_stats']});
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
        <GraphsWrapper
          sessionStats={transformData(sessionStats, preferences['session_stats_refresh'])}
          tpsStats={transformData(tpsStats, preferences['tps_stats_refresh'])}
          tiStats={transformData(tiStats, preferences['ti_stats_refresh'])}
          toStats={transformData(toStats, preferences['to_stats_refresh'])}
          bioStats={transformData(bioStats, preferences['bio_stats_refresh'])}
          errorMsg={errorMsg}
          showTooltip={preferences['graph_mouse_track']}
          showDataPoints={preferences['graph_data_points']}
          lineBorderWidth={preferences['graph_line_border_width']}
          isDatabase={did > 0}
          isTest={isTest}
        />
      }
    </>
  );
}

Graphs.propTypes = {
  preferences: PropTypes.object.isRequired,
  sid: PropTypes.oneOfType([
    PropTypes.string.isRequired,
    PropTypes.number.isRequired,
  ]),
  did: PropTypes.oneOfType([
    PropTypes.string.isRequired,
    PropTypes.number.isRequired,
  ]),
  pageVisible: PropTypes.bool,
  enablePoll: PropTypes.bool,
  isTest: PropTypes.bool,
};

export function GraphsWrapper(props) {
  const options = useMemo(()=>({
    showDataPoints: props.showDataPoints,
    showTooltip: props.showTooltip,
    lineBorderWidth: props.lineBorderWidth,
  }), [props.showTooltip, props.showDataPoints, props.lineBorderWidth]);

  return (
    <>
      <Grid container spacing={1}>
        <Grid item md={6}>
          <ChartContainer id='sessions-graph' title={props.isDatabase ?  gettext('Database sessions') : gettext('Server sessions')}
            datasets={props.sessionStats.datasets} errorMsg={props.errorMsg} isTest={props.isTest}>
            <StreamingChart data={props.sessionStats} dataPointSize={DATA_POINT_SIZE} xRange={X_AXIS_LENGTH} options={options} />
          </ChartContainer>
        </Grid>
        <Grid item md={6}>
          <ChartContainer id='tps-graph' title={gettext('Transactions per second')} datasets={props.tpsStats.datasets} errorMsg={props.errorMsg} isTest={props.isTest}>
            <StreamingChart data={props.tpsStats} dataPointSize={DATA_POINT_SIZE} xRange={X_AXIS_LENGTH} options={options} />
          </ChartContainer>
        </Grid>
      </Grid>
      <Grid container spacing={1} style={{marginTop: '4px', marginBottom: '4px'}}>
        <Grid item md={4}>
          <ChartContainer id='ti-graph' title={gettext('Tuples in')} datasets={props.tiStats.datasets} errorMsg={props.errorMsg} isTest={props.isTest}>
            <StreamingChart data={props.tiStats} dataPointSize={DATA_POINT_SIZE} xRange={X_AXIS_LENGTH} options={options} />
          </ChartContainer>
        </Grid>
        <Grid item md={4}>
          <ChartContainer id='to-graph' title={gettext('Tuples out')} datasets={props.toStats.datasets} errorMsg={props.errorMsg} isTest={props.isTest}>
            <StreamingChart data={props.toStats} dataPointSize={DATA_POINT_SIZE} xRange={X_AXIS_LENGTH} options={options} />
          </ChartContainer>
        </Grid>
        <Grid item md={4}>
          <ChartContainer id='bio-graph' title={gettext('Block I/O')} datasets={props.bioStats.datasets}  errorMsg={props.errorMsg} isTest={props.isTest}>
            <StreamingChart data={props.bioStats} dataPointSize={DATA_POINT_SIZE} xRange={X_AXIS_LENGTH} options={options} />
          </ChartContainer>
        </Grid>
      </Grid>
    </>
  );
}

const propTypeStats = PropTypes.shape({
  datasets: PropTypes.array,
  refreshRate: PropTypes.number.isRequired,
});
GraphsWrapper.propTypes = {
  sessionStats: propTypeStats.isRequired,
  tpsStats: propTypeStats.isRequired,
  tiStats: propTypeStats.isRequired,
  toStats: propTypeStats.isRequired,
  bioStats: propTypeStats.isRequired,
  errorMsg: PropTypes.string,
  showTooltip: PropTypes.bool.isRequired,
  showDataPoints: PropTypes.bool.isRequired,
  lineBorderWidth: PropTypes.number.isRequired,
  isDatabase: PropTypes.bool.isRequired,
  isTest: PropTypes.bool,
};
