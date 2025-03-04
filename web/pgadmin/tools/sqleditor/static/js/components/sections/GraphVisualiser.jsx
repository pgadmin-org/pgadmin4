/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import { styled } from '@mui/material/styles';
import React, { useContext, useState, useMemo, useEffect } from 'react';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import url_for from 'sources/url_for';
import Loader from 'sources/components/Loader';
import { Box, useTheme } from '@mui/material';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { InputSelect } from '../../../../../../static/js/components/FormComponents';
import { DefaultButton, PgButtonGroup, PgIconButton} from '../../../../../../static/js/components/Buttons';
import { LineChart, BarChart, PieChart, DATA_POINT_STYLE, DATA_POINT_SIZE,
  LightenDarkenColor} from 'sources/chartjs';
import { QueryToolEventsContext, QueryToolContext } from '../QueryToolComponent';
import { QUERY_TOOL_EVENTS, PANELS } from '../QueryToolConstants';
import { downloadUrlData, getChartColor } from '../../../../../../static/js/utils';

const StyledBox = styled(Box)(({theme}) => ({
  width: '100%',
  height: '100%',
  overflowY: 'scroll',
  display: 'flex',
  flexDirection: 'column',
  '& .GraphVisualiser-topContainer': {
    alignItems: 'flex-start',
    padding: '4px',
    backgroundColor: theme.otherVars.editorToolbarBg,
    flexWrap: 'wrap',
    ...theme.mixins.panelBorder.bottom,
    '& .GraphVisualiser-displayFlex': {
      display: 'flex',
      '& .GraphVisualiser-spanLabel': {
        alignSelf: 'center',
        minWidth: '6%',
        whiteSpace: 'nowrap',
        '& .GraphVisualiser-axisSelectCtrl': {
          minWidth: '200px',
          marginTop: '2px',
        },
        '& .GraphVisualiser-selectCtrl': {
          minWidth: '200px',
        },

      },
    },
  },
  '& .GraphVisualiser-graphContainer': {
    padding: '8px',
    flexGrow: 1,
    overflow: 'hidden',
  },
}));

// Numeric data type used to separate out the options for Y axis.
const NUMERIC_TYPES = ['oid', 'smallint', 'integer', 'bigint', 'decimal', 'numeric',
  'real', 'double precision', 'smallserial', 'serial', 'bigserial'];

// This function is used to generate the appropriate graph based on the graphType.
function GenerateGraph({graphType, graphData, ...props}) {
  const queryToolCtx = useContext(QueryToolContext);
  let showDataPoints = queryToolCtx.preferences.graphs['graph_data_points'];
  let useDiffPointStyle = queryToolCtx.preferences.graphs['use_diff_point_style'];
  let showToolTip = queryToolCtx.preferences.graphs['graph_mouse_track'];
  let lineBorderWidth = queryToolCtx.preferences.graphs['graph_line_border_width'];

  // Below options are used by chartjs while rendering the graph
  const defaultOptions = useMemo(()=>({
    plugins: {
      legend: {
        display: true,
        labels: {
          usePointStyle: false,
        },
      },
      tooltip: {
        enabled: showToolTip,
      },
      zoom: {
        pan: {
          enabled: true,
        },
        zoom: {
          drag: {
            enabled: true,
          }
        },
      }
    },
    scales: {
      x: {
        display: true,
        stacked: false,
        offset: true,
        ticks: {
          display: true,
        },
      },
      y: {
        stacked: false,
        beginAtZero: true,
      },
    },
  }));

  const lineChartOptions = useMemo(()=>({
    elements: {
      point: {
        radius: showDataPoints ? DATA_POINT_SIZE : 0,
      },
      line: {
        borderWidth: lineBorderWidth,
        fill: '-1',
      },
    },
    plugins: {
      legend: {
        labels: {
          usePointStyle: (showDataPoints && useDiffPointStyle)
        },
      },
    },
    scales: {
      x: {
        offset: false
      }
    }
  }));

  if (_.isEmpty(graphData.datasets))
    return null;

  if (graphType == 'L' || graphType == 'SL') {
    let options = _.merge(defaultOptions, lineChartOptions);
    return <LineChart options={options} data={graphData} stacked={graphType == 'SL'}
      {...props}/>;
  } else if (graphType == 'B' || graphType == 'SB') {
    return <BarChart options={defaultOptions} data={graphData} stacked={graphType == 'SB'}
      {...props}/>;
  } else if (graphType == 'P') {
    return <PieChart data={graphData} {...props}/>;
  }
  else {
    return null;
  }
}
GenerateGraph.propTypes = {
  graphType: PropTypes.string,
  graphData: PropTypes.object,
};

// This function is used to get the dataset for Line Chart and Stacked Line Chart.
function getLineChartData(graphType, rows, colName, colPosition, color, styleIndex, queryToolCtx) {
  return {
    label: colName,
    data: rows.map((r)=>r[colPosition]),
    backgroundColor: graphType == 'SL' ? LightenDarkenColor(color, 135) : color,
    borderColor:color,
    pointHitRadius: DATA_POINT_SIZE,
    pointHoverRadius: 5,
    pointStyle: queryToolCtx.preferences.graphs['use_diff_point_style'] ? DATA_POINT_STYLE[styleIndex] : 'circle',
    fill: graphType == 'L' ? false : 'origin',
  };
}

// This function is used to get the dataset for Bar Chart and Stacked Bar Chart.
function getBarChartData(rows, colName, colPosition, color) {
  return {
    label: colName,
    data: rows.map((r)=>r[colPosition]),
    backgroundColor: color,
    borderColor:color
  };
}

// This function is used to get the dataset for Pie Chart.
function getPieChartData(rows, colName, colPosition, theme) {
  return {
    label: colName,
    data: rows.map((r)=>r[colPosition]),
    backgroundColor: rows.map((_v, i)=> {
      return getChartColor(i, theme);
    }),
  };
}

// This function is used to get the graph data set for the X axis and Y axis
function getGraphDataSet(graphType, rows, columns, xaxis, yaxis, queryToolCtx, theme) {
  // Function is used to the find the position of the column
  function getColumnPosition(colName) {
    return _.find(columns, (c)=>(c.name==colName))?.pos;
  }

  let styleIndex = -1;

  return {
    'labels': rows.map((r, index)=>{
      let colPosition = getColumnPosition(xaxis);
      // If row number are selected then label should be the index + 1.
      if (xaxis === '<Row Number>') {
        return index + 1;
      }
      return r[colPosition];
    }),

    'datasets': yaxis.map((colName, i)=>{
      let color = getChartColor(i, theme);
      let colPosition = getColumnPosition(colName);

      // Loop is used to set the index for DATA_POINT_STYLE array
      if (styleIndex >= (DATA_POINT_STYLE.length - 1)) {
        styleIndex = -1;
      }
      styleIndex = styleIndex + 1;

      if (graphType === 'P') {
        return getPieChartData(rows, colName, colPosition, theme.name);
      } else if (graphType === 'B' || graphType === 'SB') {
        return getBarChartData(rows, colName, colPosition, color);
      } else if (graphType === 'L' || graphType === 'SL') {
        return getLineChartData(graphType, rows, colName, colPosition, color, styleIndex, queryToolCtx);
      }
    }),
  };
}

export function GraphVisualiser({initColumns}) {

  const chartObjRef = React.useRef();
  const contentRef = React.useRef();
  const eventBus = useContext(QueryToolEventsContext);
  const queryToolCtx = useContext(QueryToolContext);
  const [graphType, setGraphType] = useState('L');
  const [xAxis, setXAxis] = useState(null);
  const [yAxis, setYAxis] = useState([]);
  const [[graphData, graphDataKey], setGraphData] = useState([{'datasets': []}, 0]);
  const [loaderText, setLoaderText] = useState('');
  const [columns, setColumns] = useState(initColumns);
  const [graphHeight, setGraphHeight] = useState();
  const [expandedState, setExpandedState] = useState(true);
  const theme = useTheme();


  // Create X axis options for drop down.
  let xAxisOptions = useMemo(()=>{
    let retVal = [{label:gettext('<Row Number>'), value:'<Row Number>'}];
    columns.forEach((element) => {
      if (!element.is_array) {
        retVal.push({label:gettext(element.name), value:element.name});
      }
    });
    return retVal;
  }, [columns]);

  // Create Y axis options for drop down which must be of numeric type.
  let yAxisOptions = useMemo(()=>{
    let retVal = [];
    columns.forEach((element) => {
      if (!element.is_array && NUMERIC_TYPES.indexOf(element.type) >= 0) {
        retVal.push({label:gettext(element.name), value:element.name});
      }
    });
    return retVal;
  }, [columns]);

  // optionsReload is required to reset the X axis and Y axis option in InputSelect.
  let optionsReload = useMemo(()=>{
    return columns.map((c)=>c.name).join('');
  }, [columns]);

  // Use to register/deregister query execution end event. We need to reset graph
  // when query is changed and the execution of the query is ended.
  useEffect(()=>{
    let timeoutId;
    const contentResizeObserver = new ResizeObserver(()=>{
      clearTimeout(timeoutId);
      if(queryToolCtx.docker.isTabVisible(PANELS.GRAPH_VISUALISER)) {
        timeoutId = setTimeout(function () {
          setGraphHeight(contentRef.current.offsetHeight - 8);
        }, 300);
      }
    });
    contentResizeObserver.observe(contentRef.current);

    const resetGraphVisualiser = (newColumns)=>{
      setGraphData([{'datasets': []}, 0]);
      // Check the previously selected X axis column is exist in the list of
      // new columns. If exists then set that as it is.
      setXAxis((prevXAxis)=>{
        if (prevXAxis === '<Row Number>' ||
          newColumns.map((c)=>c.name).includes(prevXAxis)) {
          return prevXAxis;
        }
        return null;
      });

      // Check the previously selected Y axis columns are exist in the list of
      // new columns. If exists then set all those columns as it is.
      setYAxis((prevYAxis)=>{
        return newColumns.map((c)=>c.name).filter((colName)=>{
          return prevYAxis.includes(colName);
        });
      });

      setColumns(newColumns);
    };

    eventBus.registerListener(QUERY_TOOL_EVENTS.RESET_GRAPH_VISUALISER, resetGraphVisualiser);
    return ()=>{
      eventBus.deregisterListener(QUERY_TOOL_EVENTS.RESET_GRAPH_VISUALISER, resetGraphVisualiser);
    };
  }, []);

  // Reset the Y axis if graph type is Pie Chart.
  useEffect(()=>{
    if (graphType === 'P') {
      setYAxis('');
    }
  }, [graphType, theme]);

  const graphBackgroundColor = useMemo(() => {
    return theme.palette.background.default;
  },[theme]);


  const beforeDrawFunc = (chart) => {
    const ctx = chart.canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = graphBackgroundColor;
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  };

  // Generate button callback
  const onGenerate = async ()=>{
    setLoaderText(gettext('Fetching all the records...'));

    if (graphData?.datasets?.length > 0) {
      onResetZoom();
    }

    let url = url_for('sqleditor.fetch_all_from_start', {
      'trans_id': queryToolCtx.params.trans_id,
      'limit': queryToolCtx.preferences.sqleditor.row_limit
    });

    let res = await queryToolCtx.api.get(url);

    setLoaderText(gettext('Rendering data points...'));
    // Set the Graph Data
    setGraphData(
      (prev)=> [
        getGraphDataSet(graphType, res.data.data.result, columns, xAxis, _.isArray(yAxis) ? yAxis : [yAxis] , queryToolCtx, theme.name),
        prev[1] + 1
      ]
    );

    setLoaderText('');
  };

  // Reset the zoom to normal
  const onResetZoom = ()=> {
    chartObjRef?.current?.resetZoom();
  };

  // Download button callback
  const onDownloadGraph = async ()=> {
    let downloadUrl = chartObjRef.current.toBase64Image(),
      fileName = 'graph_visualiser-' + new Date().getTime() + '.png';
    downloadUrlData(downloadUrl, fileName);
  };

  // This plugin is used to set the background color of the canvas. Very useful
  // when downloading the graph.
  const plugin = {
    beforeDraw: (chart) => {
      beforeDrawFunc(chart);
    }
  };

  return (
    <StyledBox>
      <Loader message={loaderText} />
      <Box className='GraphVisualiser-topContainer'>
        <Box className='GraphVisualiser-displayFlex'>
          <span className='GraphVisualiser-spanLabel' >{gettext('Graph Type')}</span>
          <InputSelect className='GraphVisualiser-selectCtrl' controlProps={{allowClear: false}}
            options={[
              {label: gettext('Line Chart'), value: 'L'},
              {label: gettext('Stacked Line Chart'), value: 'SL'},
              {label: gettext('Bar Chart'), value: 'B'},
              {label: gettext('Stacked Bar Chart'), value: 'SB'},
              {label: gettext('Pie Chart'), value: 'P'},
            ]} onChange={(v)=>{
              setGraphType(v);
              if (graphType === 'P' || v === 'P') {
                setExpandedState(true);
              }
            }} value={graphType} />
          <DefaultButton style={{marginLeft: 'auto'}} onClick={onGenerate} startIcon={<ShowChartRoundedIcon />}
            disabled={ _.isEmpty(xAxis) || yAxis.length <= 0 }>
            {gettext('Generate')}
          </DefaultButton>
          <PgIconButton title={expandedState ? gettext('Collapse') : gettext('Expand')}
            icon={expandedState ? <ExpandLessRoundedIcon style={{height: '1.2rem'}}/> : <ExpandMoreRoundedIcon style={{height: '1.2rem'}}/>}
            onClick={()=>{setExpandedState(!expandedState);}}/>
        </Box>
        { expandedState && <>
          <Box className='GraphVisualiser-displayFlex'>
            <span className='GraphVisualiser-spanLabel'>{graphType != 'P' ? gettext('X Axis') : gettext('Label')}</span>
            <InputSelect className='GraphVisualiser-axisSelectCtrl' options={xAxisOptions}
              onChange={(v)=>setXAxis(v)} value={xAxis} optionsReloadBasis={optionsReload}/>
          </Box>
          <Box className='GraphVisualiser-displayFlex'>
            <span className='GraphVisualiser-spanLabel'>{graphType != 'P' ? gettext('Y Axis') : gettext('Value')}</span>
            <InputSelect className='GraphVisualiser-axisSelectCtrl' controlProps={{'multiple': graphType != 'P', allowSelectAll: graphType != 'P'}}
              options={yAxisOptions} onChange={(v)=>setYAxis(v)} value={yAxis} optionsReloadBasis={optionsReload}/>
          </Box>
        </>
        }
      </Box>
      <Box display="flex" marginLeft="3px" marginTop="3px">
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Zoom to original')} icon={<ZoomOutMapIcon style={{height: '1.2rem'}}/>}
            onClick={()=>onResetZoom()} disabled={ graphData.datasets.length <= 0 }/>
          <PgIconButton title={gettext('Download')} icon={<SaveAltIcon style={{height: '1.2rem'}}/>}
            onClick={onDownloadGraph} disabled={ graphData.datasets.length <= 0 }/>
        </PgButtonGroup>
      </Box>
      <Box ref={contentRef} className='GraphVisualiser-graphContainer'>
        <Box style={{height:`${graphHeight}px`}}>
          {useMemo(()=> <GenerateGraph graphType={graphType} graphData={graphData} onInit={(chartObj)=> {
            chartObjRef.current = chartObj;
          }} plugins={[plugin]}/>, [graphDataKey])}
        </Box>
      </Box>
    </StyledBox>
  );
}
GraphVisualiser.propTypes = {
  initColumns: PropTypes.array
};
