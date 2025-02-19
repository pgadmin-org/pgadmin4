/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useState, useEffect, useRef, useReducer, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import url_for from 'sources/url_for';
import {getGCD, getEpoch} from 'sources/utils';
import ChartContainer from '../components/ChartContainer';
import { Grid } from '@mui/material';
import { DATA_POINT_SIZE } from 'sources/chartjs';
import StreamingChart from '../../../../static/js/components/PgChart/StreamingChart';
import {useInterval, usePrevious} from 'sources/custom_hooks';
import axios from 'axios';
import { BarChart, PieChart } from '../../../../static/js/chartjs';
import { getStatsUrl, transformData, X_AXIS_LENGTH } from './utility.js';
import { toPrettySize } from '../../../../static/js/utils';
import Table from '../../../../static/js/components/Table';
import SectionContainer from '../components/SectionContainer.jsx';


const Root = styled('div')(({theme}) => ({
  '& .Storage-tableContainer': {
    background: theme.otherVars.tableBg,
    padding: '0px',
    border: '1px solid '+theme.otherVars.borderColor,
    borderCollapse: 'collapse',
    borderRadius: '4px',
    overflow: 'auto',
    width: '100%',
    margin: '4px 4px 4px 4px',
    '& .Storage-containerHeaderText': {
      fontWeight: 'bold',
      padding: '4px 8px',
    },
    '& .Storage-tableWhiteSpace': {
      '& td, & th': {
        whiteSpace: 'break-spaces !important',
      },
    },
  },
}));

const colors = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#8D6E63', '#2196F3', '#FFEB3B', '#9C27B0',
  '#00BCD4', '#CDDC39', '#FF5722', '#3F51B5', '#FFC107',
  '#607D8B', '#E91E63', '#009688', '#795548', '#FF9800'
];

/* This will process incoming charts data add it the previous charts
 * data to get the new state.
 */
export function ioStatsReducer(state, action) {

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
  Object.keys(action.incoming).forEach(disk_stats => {
    newState[disk_stats] = {};
    Object.keys(action.incoming[disk_stats]).forEach(type => {
      newState[disk_stats][type] = {};
      Object.keys(action.incoming[disk_stats][type]).forEach(label => {
        if(state[disk_stats][type][label]) {
          newState[disk_stats][type][label] = [
            action.counter ?  action.incoming[disk_stats][type][label] - action.counterData[disk_stats][type][label] : action.incoming[disk_stats][type][label],
            ...state[disk_stats][type][label].slice(0, X_AXIS_LENGTH-1),
          ];
        } else {
          newState[disk_stats][type][label] = [
            action.counter ?  action.incoming[disk_stats][type][label] - action.counterData[disk_stats][type][label] : action.incoming[disk_stats][type][label],
          ];
        }
      });
    });
  });
  return newState;
}

const chartsDefault = {
  'io_stats': {},
};


const DiskStatsTable = (props) => {

  const tableHeader = props.tableHeader;
  const data = props.data;
  return (
    <Table classNameRoot='Storage-tableWhiteSpace'>
      <thead>
        <tr>
          {tableHeader.map((item) => (
            <th key={item.header}>{item.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.file_system_type + item.mount_point}>
            {tableHeader.map((header, id) => (
              <td key={header.accessorKey+'-'+id}>{item[header.accessorKey]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

DiskStatsTable.propTypes = {
  data: PropTypes.array.isRequired,
  tableHeader: PropTypes.array.isRequired,
};

export default function Storage({preferences, sid, did, pageVisible, enablePoll=true, systemStatsTabVal}) {
  const refreshOn = useRef(null);
  const prevPrefernces = usePrevious(preferences);

  const [diskStats, setDiskStats] = useState([]);
  const [ioInfo, ioInfoReduce] = useReducer(ioStatsReducer, chartsDefault['io_stats']);

  const [pollDelay, setPollDelay] = useState(5000);
  const [errorMsg, setErrorMsg] = useState(null);
  const [chartDrawnOnce, setChartDrawnOnce] = useState(false);

  const tableHeader = [
    {
      header: gettext('File system'),
      accessorKey: 'file_system',
    },
    {
      header: gettext('File system type'),
      accessorKey: 'file_system_type',
    },
    {
      header: gettext('Mount point'),
      accessorKey: 'mount_point',
    },
    {
      header: gettext('Drive letter'),
      accessorKey: 'drive_letter',
    },
    {
      header: gettext('Total space'),
      accessorKey: 'total_space',
    },
    {
      header: gettext('Used space'),
      accessorKey: 'used_space',
    },
    {
      header: gettext('Free space'),
      accessorKey: 'free_space',
    },
    {
      header: gettext('Total inodes'),
      accessorKey: 'total_inodes',
    },
    {
      header: gettext('Used inodes'),
      accessorKey: 'used_inodes',
    },
    {
      header: gettext('Free inodes'),
      accessorKey: 'free_inodes',
    },
  ];

  useEffect(()=>{
    let calcPollDelay = false;
    if(prevPrefernces) {
      if(prevPrefernces['io_stats_refresh'] != preferences['io_stats_refresh']) {
        ioInfoReduce({reset: chartsDefault['io_stats']});
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
      url += '?chart_names=' + 'di_stats';
      axios.get(url)
        .then((res) => {
          let data = res.data;
          setErrorMsg(null);
          if(data.hasOwnProperty('di_stats')){
            let di_info_list = [];
            const di_info_obj = data['di_stats'];
            for (const key in di_info_obj) {
              di_info_list.push({
                icon: '',
                file_system: di_info_obj[key]['file_system']?gettext(di_info_obj[key]['file_system']):'',
                file_system_type: di_info_obj[key]['file_system_type']?gettext(di_info_obj[key]['file_system_type']):'',
                mount_point: di_info_obj[key]['mount_point']?gettext(di_info_obj[key]['mount_point']):'',
                drive_letter: di_info_obj[key]['drive_letter']?gettext(di_info_obj[key]['drive_letter']):'',
                total_space: di_info_obj[key]['total_space']?toPrettySize(di_info_obj[key]['total_space']):'',
                used_space: di_info_obj[key]['used_space']?toPrettySize(di_info_obj[key]['used_space']):'',
                free_space: di_info_obj[key]['free_space']?toPrettySize(di_info_obj[key]['free_space']):'',
                total_inodes: di_info_obj[key]['total_inodes']?di_info_obj[key]['total_inodes']:'',
                used_inodes: di_info_obj[key]['used_inodes']?di_info_obj[key]['used_inodes']:'',
                free_inodes: di_info_obj[key]['free_inodes']?di_info_obj[key]['free_inodes']:'',
                total_space_actual: di_info_obj[key]['total_space']?di_info_obj[key]['total_space']:null,
                used_space_actual: di_info_obj[key]['used_space']?di_info_obj[key]['used_space']:null,
                free_space_actual: di_info_obj[key]['free_space']?di_info_obj[key]['free_space']:null,
              });
            }
            setDiskStats(di_info_list);
          }
        })
        .catch((error) => {
          console.error('Error fetching data:', error);
        });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [systemStatsTabVal, sid, did, enablePoll, pageVisible]);

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
        if(data.hasOwnProperty('io_stats')){
          const io_info_obj = data['io_stats'];
          for (const disk in io_info_obj) {
            const device_name = (io_info_obj[disk]['device_name'] != null && io_info_obj[disk]['device_name'] != '')?io_info_obj[disk]['device_name']:`${disk}`;
            if(!chartsDefault.io_stats.hasOwnProperty(device_name)){
              chartsDefault.io_stats[device_name] = {};
              chartsDefault.io_stats[device_name][`${device_name}_total_rw`] = {'Read': [], 'Write': []};
              chartsDefault.io_stats[device_name][`${device_name}_bytes_rw`] = {'Read': [], 'Write': []};
              chartsDefault.io_stats[device_name][`${device_name}_time_rw`] = {'Read': [], 'Write': []};
            }
            if(!ioInfo.hasOwnProperty(device_name)){
              ioInfo[device_name] = {};
              ioInfo[device_name][`${device_name}_total_rw`] = {'Read': [], 'Write': []};
              ioInfo[device_name][`${device_name}_bytes_rw`] = {'Read': [], 'Write': []};
              ioInfo[device_name][`${device_name}_time_rw`] = {'Read': [], 'Write': []};
            }
          }

          let new_io_stats = {};
          for (const disk in io_info_obj) {
            const device_name = (io_info_obj[disk]['device_name'] != null && io_info_obj[disk]['device_name'] != '')?io_info_obj[disk]['device_name']:`${disk}`;
            new_io_stats[device_name] = {};
            new_io_stats[device_name][`${device_name}_total_rw`] = {'Read': io_info_obj[`${disk}`]['total_reads']?io_info_obj[`${disk}`]['total_reads']:0, 'Write': io_info_obj[`${disk}`]['total_writes']?io_info_obj[`${disk}`]['total_writes']:0};
            new_io_stats[device_name][`${device_name}_bytes_rw`] = {'Read': io_info_obj[`${disk}`]['read_bytes']?io_info_obj[`${disk}`]['read_bytes']:0, 'Write': io_info_obj[`${disk}`]['write_bytes']?io_info_obj[`${disk}`]['write_bytes']:0};
            new_io_stats[device_name][`${device_name}_time_rw`] = {'Read': io_info_obj[`${disk}`]['read_time_ms']?io_info_obj[`${disk}`]['read_time_ms']:0, 'Write': io_info_obj[`${disk}`]['write_time_ms']?io_info_obj[`${disk}`]['write_time_ms']:0};
          }
          ioInfoReduce({incoming: new_io_stats});
        }
      })
      .catch((error)=>{
        if(!errorMsg) {
          ioInfoReduce({reset:chartsDefault['io_stats']});
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
    (<Root>
      <div data-testid='graph-poll-delay' style={{display: 'none'}}>{pollDelay}</div>
      {chartDrawnOnce &&
        <StorageWrapper
          ioInfo={ioInfo}
          ioRefreshRate={preferences['io_stats_refresh']}
          diskStats={diskStats}
          tableHeader={tableHeader}
          errorMsg={errorMsg}
          showTooltip={preferences['graph_mouse_track']}
          showDataPoints={preferences['graph_data_points']}
          lineBorderWidth={preferences['graph_line_border_width']}
          isTest={false}
        />
      }
    </Root>)
  );
}

Storage.propTypes = {
  preferences: PropTypes.object.isRequired,
  sid: PropTypes.oneOfType([PropTypes.string.isRequired, PropTypes.number.isRequired]),
  did: PropTypes.oneOfType([PropTypes.string.isRequired, PropTypes.number.isRequired]),
  pageVisible: PropTypes.bool,
  enablePoll: PropTypes.bool,
  systemStatsTabVal: PropTypes.number,
};

export function StorageWrapper(props) {

  const options = useMemo(()=>({
    showDataPoints: props.showDataPoints,
    showTooltip: props.showTooltip,
    lineBorderWidth: props.lineBorderWidth,
  }), [props.showTooltip, props.showDataPoints, props.lineBorderWidth]);

  const chartJsExtraOptions = {
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        animation: false,
        callbacks: {
          title: function (context) {
            const label = context[0].label || '';
            return label;
          },
          label: function (context) {
            return `${context.dataset?.label ?? gettext('Total space')}: ${toPrettySize(context.raw)}`;
          },
        },
      },
    },
  };

  function getLabel(item, index) {
    if (item.mount_point !== '')
      return item.mount_point;

    return item.drive_letter !== '' ? item.drive_letter : 'disk' + index;
  }

  function getChartContainerTitle(type) {
    if (type.endsWith('_bytes_rw'))
      return gettext('Data transfer');
    if (type.endsWith('_total_rw'))
      return gettext('I/O operations count');
    if (type.endsWith('_time_rw'))
      return gettext('Time spent in I/O operations');

    return '';
  }

  function getValue(type, v) {
    if (type.endsWith('_time_rw'))
      return toPrettySize(v, 'ms');
    if (type.endsWith('_total_rw'))
      return toPrettySize(v, '');

    return toPrettySize(v);
  }

  return (
    <Root>
      <div className='Storage-tableContainer'>
        <div className='Storage-containerHeaderText'>{gettext('Disk information')}</div>
        <DiskStatsTable tableHeader={props.tableHeader} data={props.diskStats} />
      </div>
      <Grid container spacing={0.5} sx={{marginBottom: '4px'}}>
        <Grid item md={6} sm={12}>
          <ChartContainer
            id='t-space-graph'
            title={''}
            datasets={props.diskStats.map((item, index) => ({
              borderColor: colors[(index + 2) % colors.length],
              label: getLabel(item, index),
            }))}
            errorMsg={props.errorMsg}
            isTest={props.isTest}>
            <PieChart data={{
              labels: props.diskStats.map((item, index) => getLabel(item, index)),
              datasets: [
                {
                  data: props.diskStats.map((item) => item.total_space_actual?item.total_space_actual:0),
                  backgroundColor: props.diskStats.map((item, index) => colors[(index + 2) % colors.length]),
                },
              ],
            }}
            options={{
              animation: false,
              ...chartJsExtraOptions,
            }}
            />
          </ChartContainer>
        </Grid>
        <Grid item md={6} sm={12}>
          <ChartContainer id='ua-space-graph' title={''} datasets={[{borderColor: '#FF6384', label: 'Used space'}, {borderColor: '#36a2eb', label: 'Available space'}]}  errorMsg={props.errorMsg} isTest={props.isTest}>
            <BarChart data={{
              labels: props.diskStats.map((item, index) => getLabel(item, index)),
              datasets: [
                {
                  label: 'Used space',
                  data: props.diskStats.map((item) => item.used_space_actual?item.used_space_actual:0),
                  backgroundColor: '#FF6384',
                  borderColor: '#FF6384',
                  borderWidth: 1,
                },
                {
                  label: 'Available space',
                  data: props.diskStats.map((item) => item.free_space_actual?item.free_space_actual:0),
                  backgroundColor: '#36a2eb',
                  borderColor: '#36a2eb',
                  borderWidth: 1,
                },
              ],
            }}
            options={
              {
                scales: {
                  x: {
                    display: true,
                    stacked: true,
                    ticks: {
                      display: true,
                    },
                  },
                  y: {
                    beginAtZero: true,
                    stacked: true,
                    ticks: {
                      callback: function (value) {
                        return toPrettySize(value);
                      },
                    },
                  },
                },
                ...chartJsExtraOptions,
              }
            }
            />
          </ChartContainer>
        </Grid>
      </Grid>
      {Object.keys(props.ioInfo).map((drive) => (
        <SectionContainer key={drive} title={drive} style={{minHeight: 'unset', height: 'auto', marginBottom: '0.5px'}}>
          <Grid container spacing={0.5} p={0.5}>
            {Object.keys(props.ioInfo[drive]).map((type, innerKeyIndex) => (
              <Grid key={`${type}-${innerKeyIndex}`} item md={4} sm={6}>
                <ChartContainer id={`io-graph-${type}`} title={getChartContainerTitle(type)} datasets={transformData(props.ioInfo[drive][type], props.ioRefreshRate).datasets}  errorMsg={props.errorMsg} isTest={props.isTest}>
                  <StreamingChart data={transformData(props.ioInfo[drive][type], props.ioRefreshRate)} dataPointSize={DATA_POINT_SIZE} xRange={X_AXIS_LENGTH} options={options}
                    valueFormatter={(v)=>{
                      return getValue(type, v);
                    }} />
                </ChartContainer>
              </Grid>
            ))}
          </Grid>
        </SectionContainer>
      ))}
    </Root>
  );
}

StorageWrapper.propTypes = {
  ioInfo: PropTypes.objectOf(
    PropTypes.objectOf(
      PropTypes.shape({
        Read: PropTypes.array,
        Write: PropTypes.array,
      })
    )
  ),
  ioRefreshRate: PropTypes.number.isRequired,
  diskStats: PropTypes.array.isRequired,
  tableHeader: PropTypes.array.isRequired,
  errorMsg: PropTypes.string,
  showTooltip: PropTypes.bool.isRequired,
  showDataPoints: PropTypes.bool.isRequired,
  lineBorderWidth: PropTypes.number.isRequired,
  isTest: PropTypes.bool,
};
