/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import React, { useContext, useState, useMemo, useEffect } from 'react';
import gettext from 'sources/gettext';
import Theme from 'sources/Theme';
import PropTypes from 'prop-types';
import url_for from 'sources/url_for';
import Loader from 'sources/components/Loader';
import { makeStyles } from '@material-ui/styles';
import { Box } from '@material-ui/core';
import ShowChartRoundedIcon from '@material-ui/icons/ShowChartRounded';
import ZoomOutMapIcon from '@material-ui/icons/ZoomOutMap';
import SaveAltIcon from '@material-ui/icons/SaveAlt';
import { InputSelect } from '../../../../../../static/js/components/FormComponents';
import { DefaultButton, PgButtonGroup, PgIconButton} from '../../../../../../static/js/components/Buttons';
import { LineChart, DATA_POINT_STYLE, DATA_POINT_SIZE,
  CHART_THEME_COLORS, CHART_THEME_COLORS_LENGTH} from 'sources/chartjs';
import { QueryToolEventsContext, QueryToolContext } from '../QueryToolComponent';
import { QUERY_TOOL_EVENTS, PANELS } from '../QueryToolConstants';
import { LayoutHelper } from '../../../../../../static/js/helpers/Layout';

// Numeric data type used to separate out the options for Y axis.
const NUMERIC_TYPES = ['oid', 'smallint', 'integer', 'bigint', 'decimal', 'numeric',
  'real', 'double precision', 'smallserial', 'serial', 'bigserial'];

const useStyles = makeStyles((theme)=>({
  mainContainer: {
    width: '100%',
    height: '100%',
    overflowY: 'scroll',
    display: 'flex',
    flexDirection: 'column',
  },
  topContainer: {
    alignItems: 'flex-start',
    padding: '4px',
    backgroundColor: theme.otherVars.editorToolbarBg,
    flexWrap: 'wrap',
    ...theme.mixins.panelBorder.bottom,
  },
  displayFlex: {
    display: 'flex',
  },
  graphContainer: {
    padding: '8px',
    flexGrow: 1,
    overflow: 'hidden',
  },
  spanLabel: {
    alignSelf: 'center',
    marginRight: '4px',
  },
  selectCtrl: {
    minWidth: '200px',
  },
}));

// This function is used to generate the appropriate graph based on the graphType.
function GenerateGraph({graphType, graphData, ...props}) {
  const queryToolCtx = useContext(QueryToolContext);
  let showDataPoints = queryToolCtx.preferences.graphs['graph_data_points'];
  let useDiffPointStyle = queryToolCtx.preferences.graphs['use_diff_point_style'];
  let showToolTip = queryToolCtx.preferences.graphs['graph_mouse_track'];
  let lineBorderWidth = queryToolCtx.preferences.graphs['graph_line_border_width'];

  // Below options are used by chartjs while rendering the graph
  const options = useMemo(()=>({
    elements: {
      point: {
        radius: showDataPoints ? DATA_POINT_SIZE : 0,
      },
      line: {
        borderWidth: lineBorderWidth,
      },
    },
    plugins: {
      legend: {
        display: true,
        labels: {
          usePointStyle: (showDataPoints && useDiffPointStyle) ? true : false
        },
      },
      tooltip: {
        enabled: showToolTip,
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          modifierKey: 'ctrl',
        },
        zoom: {
          drag: {
            enabled: true,
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1,
            backgroundColor: 'rgba(54, 162, 235, 0.3)'
          },
          mode: 'x',
        },
      }
    },
    scales: {
      x: {
        display: true,
        ticks: {
          display: true,
        },
      },
    },
  }));

  if (_.isEmpty(graphData.datasets))
    return null;

  if (graphType == 'L') {
    return <LineChart options={options} data={graphData} {...props}/>;
  } else {
    return null;
  }
}
GenerateGraph.propTypes = {
  graphType: PropTypes.string,
  graphData: PropTypes.object,
};

// This function is used to get the data set for the X axis and Y axis
function getGraphDataSet(rows, columns, xaxis, yaxis, queryToolCtx) {
  // Function is used to the find the position of the column
  function getColumnPosition(colName) {
    return _.find(columns, (c)=>(c.name==colName))?.pos;
  }

  let styleIndex = -1, colorIndex = -1;

  return {
    'labels': rows.map((r, index)=>{
      let colPosition = getColumnPosition(xaxis);
      // If row number are selected then label should be the index + 1.
      if (xaxis === '<Row Number>') {
        return index + 1;
      }
      return r[colPosition];
    }),

    'datasets': yaxis.map((colName)=>{
      // Loop is used to set the index for random color array
      if (colorIndex >= (CHART_THEME_COLORS_LENGTH - 1)) {
        colorIndex = -1;
      }
      colorIndex = colorIndex + 1;

      let color = CHART_THEME_COLORS[queryToolCtx.preferences.misc.theme][colorIndex];
      let colPosition = getColumnPosition(colName);

      // Loop is used to set the index for DATA_POINT_STYLE array
      if (styleIndex >= (DATA_POINT_STYLE.length - 1)) {
        styleIndex = -1;
      }
      styleIndex = styleIndex + 1;

      return {
        label: colName,
        data: rows.map((r)=>r[colPosition]),
        backgroundColor: color,
        borderColor:color,
        pointHitRadius: DATA_POINT_SIZE,
        pointHoverRadius: 5,
        pointStyle: queryToolCtx.preferences.graphs['use_diff_point_style'] ? DATA_POINT_STYLE[styleIndex] : 'circle'
      };
    }),
  };
}

export function GraphVisualiser({initColumns}) {
  const classes = useStyles();
  const chartObjRef = React.useRef();
  const contentRef = React.useRef();
  const eventBus = useContext(QueryToolEventsContext);
  const queryToolCtx = useContext(QueryToolContext);
  const [graphType, setGraphType] = useState('L');
  const [xaxis, setXAxis] = useState(null);
  const [yaxis, setYAxis] = useState([]);
  const [graphData, setGraphData] = useState({'datasets': []});
  const [loaderText, setLoaderText] = useState('');
  const [columns, setColumns] = useState(initColumns);
  const [graphHeight, setGraphHeight] = useState();


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
      if(LayoutHelper.isTabVisible(queryToolCtx.docker, PANELS.GRAPH_VISUALISER)) {
        timeoutId = setTimeout(function () {
          setGraphHeight(contentRef.current.offsetHeight);
        }, 300);
      }
    });
    contentResizeObserver.observe(contentRef.current);

    const resetGraphVisualiser = (newColumns)=>{
      setGraphData({'datasets': []});
      setXAxis(null);
      setYAxis([]);
      setColumns(newColumns);
    };

    eventBus.registerListener(QUERY_TOOL_EVENTS.RESET_GRAPH_VISUALISER, resetGraphVisualiser);
    return ()=>{
      eventBus.deregisterListener(QUERY_TOOL_EVENTS.RESET_GRAPH_VISUALISER, resetGraphVisualiser);
    };
  }, []);

  // Generate button callback
  const onGenerate = async ()=>{
    setLoaderText(gettext('Fetching all the records...'));

    let url = url_for('sqleditor.fetch_all_from_start', {
      'trans_id': queryToolCtx.params.trans_id,
      'limit': queryToolCtx.preferences.sqleditor.row_limit
    });

    let res = await queryToolCtx.api.get(url);

    setLoaderText(gettext('Rendering data points...'));
    // Set the Graph Data
    setGraphData(
      getGraphDataSet(res.data.data.result, columns, xaxis, yaxis, queryToolCtx)
    );

    onResetZoom();
    setLoaderText('');
  };

  // Reset the zoom to normal
  const onResetZoom = ()=> {
    chartObjRef?.current?.resetZoom();
  };

  // Download button callback
  const onDownloadGraph = ()=> {
    let a = document.createElement('a');
    a.href = chartObjRef.current.toBase64Image();
    a.download = 'graph_visualiser-' + new Date().getTime() + '.png';
    a.click();
  };

  // This plugin is used to set the background color of the canvas. Very useful
  // when downloading the graph.
  const plugin = {
    beforeDraw: (chart) => {
      const ctx = chart.canvas.getContext('2d');
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-bg');
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    }
  };

  return (
    <Theme>
      <Box className={classes.mainContainer}>
        <Loader message={loaderText} />
        <Box className={classes.topContainer}>
          <Box className={classes.displayFlex}>
            <Box className={classes.displayFlex}>
              <span className={classes.spanLabel}>{gettext('X Axis')}</span>
              <InputSelect className={classes.selectCtrl} options={xAxisOptions}
                onChange={(v)=>setXAxis(v)} value={xaxis} optionsReloadBasis={optionsReload}/>
            </Box>
            <Box className={classes.displayFlex} marginLeft="auto">
              <span className={classes.spanLabel} >{gettext('Graph Type')}</span>
              <InputSelect className={classes.selectCtrl} controlProps={{allowClear: false}}
                options={[
                  {label: gettext('Line Chart'), value: 'L'},
                  {label: gettext('<More charts coming soon>'), value: 'L'}
                ]} onChange={(v)=>setGraphType(v)} value={graphType} />
            </Box>
            <DefaultButton onClick={onGenerate} startIcon={<ShowChartRoundedIcon />}
              disabled={ _.isEmpty(xaxis) || yaxis.length <= 0 }>
              {gettext('Generate')}
            </DefaultButton>
          </Box>
          <Box className={classes.displayFlex}>
            <span className={classes.spanLabel}>{gettext('Y Axis')}</span>
            <InputSelect className={classes.selectCtrl} controlProps={{'multiple': true, allowSelectAll: true}}
              options={yAxisOptions} onChange={(v)=>setYAxis(v)} value={yaxis} optionsReloadBasis={optionsReload}/>
          </Box>
        </Box>
        <Box display="flex" marginLeft="3px" marginTop="3px">
          <PgButtonGroup size="small">
            <PgIconButton title={gettext('Zoom to original')} icon={<ZoomOutMapIcon style={{height: '1.2rem'}}/>}
              onClick={()=>onResetZoom()} disabled={ graphData.datasets.length <= 0 }/>
            <PgIconButton title={gettext('Download')} icon={<SaveAltIcon style={{height: '1.2rem'}}/>}
              onClick={onDownloadGraph} disabled={ graphData.datasets.length <= 0 }/>
          </PgButtonGroup>
        </Box>
        <Box ref={contentRef} className={classes.graphContainer}>
          <Box style={{height:`${graphHeight}px`}}>
            <GenerateGraph graphType={graphType} graphData={graphData} onInit={(chartObj)=> {
              chartObjRef.current = chartObj;
            }} plugins={plugin}/>
          </Box>
        </Box>
      </Box>
    </Theme>
  );
}
GraphVisualiser.propTypes = {
  initColumns: PropTypes.array
};
