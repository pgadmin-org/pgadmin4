/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import PropTypes from 'prop-types';
import _ from 'lodash';

export const DATA_POINT_STYLE = ['circle', 'cross', 'crossRot', 'rect',
  'rectRounded', 'rectRot', 'star', 'triangle'];
export const DATA_POINT_SIZE = 3;
export const CHART_THEME_COLORS_LENGTH = 24;
export const CHART_THEME_COLORS = {
  'standard':['#3366CC', '#DC3912', '#FF9900', '#109618', '#990099', '#0099C6',
    '#DD4477', '#66AA00', '#B82E2E', '#316395', '#994499', '#22AA99',
    '#AAAA11', '#6633CC', '#E67300', '#8B0707', '#651067', '#329262',
    '#5574A6', '#3B3EAC', '#B77322', '#16D620', '#B91383', '#F4359E'],
  'dark': ['#7371FC', '#3A86FF', '#979DAC', '#D4A276', '#2A9D8F', '#FFEE32',
    '#70E000', '#FF477E', '#7DC9F1', '#52B788', '#E4E487', '#2EC4B6',
    '#DB7C74', '#8AC926', '#FF8FA3', '#B388EB', '#FB5607', '#EEA236',
    '#EDC531', '#D4D700', '#FFFB69', '#7FCC5C', '#50B0F0', '#00B4D8'],
  'high_contrast': ['#FF6C49', '#00B4D8', '#45D48A', '#FFFB69', '#B388EB',
    '#D4A276', '#2EC4B6', '#7DC9F1', '#50B0F0', '#52B788', '#70E000',
    '#7FCC5C', '#8AC926', '#979DAC', '#D4D700', '#DEFF00', '#E4E487',
    '#EDC531', '#EEA236', '#F8845F', '#FB4BF6', '#FF8FA3', '#FFEE32', '#FFFFFF']
};

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  normalized: true,
  animation: {
    duration: 0,
    active: {
      duration: 0,
    },
    resize: {
      duration: 0,
    },
  },
  elements: {
    line: {
      tension: 0,
      fill: false,
    },
  },
  layout: {
    padding: 8,
  },
  scales: {
    x: {
      display: false,
      grid: {
        display: false,
      },
      ticks: {
        display: false,
        color: getComputedStyle(document.documentElement).getPropertyValue('--color-fg'),
      },
    },
    y: {
      ticks: {
        callback: function(label) {
          if (Math.floor(label) === label) {
            return label;
          }
        },
        color: getComputedStyle(document.documentElement).getPropertyValue('--color-fg'),
      },
      grid: {
        drawBorder: false,
        zeroLineColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color'),
        color: getComputedStyle(document.documentElement).getPropertyValue('--border-color'),
      },
    },
  },
  plugins: {
    zoom: {
      pan: {
        enabled: false,
        mode: 'x',
        modifierKey: 'ctrl',
      },
      zoom: {
        drag: {
          enabled: false,
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1,
          backgroundColor: 'rgba(54, 162, 235, 0.3)'
        },
        mode: 'x',
      },
    }
  }
};

const stackedOptions = {
  scales: {
    x: {
      stacked: true,
    },
    y: {
      stacked: true,
    },
  }
};

export default function BaseChart({type='line', id, options, data, redraw=false, plugins={}, ...props}) {
  const chartRef = React.useRef();
  const chartObj = React.useRef();
  let optionsMerged = _.merge(defaultOptions, options);

  const initChart = function() {
    Chart.register(...registerables);
    // Register for Zoom Plugin
    Chart.register(zoomPlugin);
    let chartContext = chartRef.current.getContext('2d');
    chartObj.current = new Chart(chartContext, {
      type: type,
      data: data,
      plugins: [plugins],
      options: optionsMerged,
    });
    props.onInit && props.onInit(chartObj.current);
  };

  const destroyChart = function() {
    chartObj.current?.resetZoom?.();
    chartObj.current && chartObj.current.destroy();
  };

  useEffect(()=>{
    initChart();
    return destroyChart;
  }, []);

  useEffect(()=>{
    if(typeof(chartObj.current) != 'undefined') {
      chartObj.current.data = data;
      for(let i=0; i<chartObj.current.data.datasets.length; i++) {
        chartObj.current.data.datasets[i] = {
          ...chartObj.current.data.datasets[i],
          ...data.datasets[i],
        };
      }
      chartObj.current.options = optionsMerged;
      chartObj.current.update(props.updateOptions || {});
      props.onUpdate && props.onUpdate(chartObj.current);
    }
  }, [data, options]);

  useEffect(()=>{
    if(redraw) {
      destroyChart();
      initChart();
    }
  }, [redraw]);

  return (
    <canvas id={id} ref={chartRef}></canvas>
  );
}

BaseChart.propTypes = {
  type: PropTypes.string.isRequired,
  id: PropTypes.string,
  data: PropTypes.object.isRequired,
  options: PropTypes.object,
  redraw: PropTypes.bool,
  updateOptions: PropTypes.object,
  onInit: PropTypes.func,
  onUpdate: PropTypes.func,
  plugins: PropTypes.object,
};

export function LineChart({stacked, options, ...props}) {
  // if stacked true then merge the stacked specific options.
  options = stacked ? _.merge(options, stackedOptions) : options;
  return (
    <BaseChart {...props} options={options} type='line'/>
  );
}
LineChart.propTypes = {
  options: PropTypes.object,
  stacked: PropTypes.bool
};

export function BarChart({stacked, options, ...props}) {
  // if stacked true then merge the stacked specific options.
  options = stacked ? _.merge(options, stackedOptions) : options;
  return (
    <BaseChart {...props} options={options} type='bar'/>
  );
}
BarChart.propTypes = {
  options: PropTypes.object,
  stacked: PropTypes.bool
};

export function ConvertHexToRGBA(hex, opacity) {
  const tempHex = hex.replace('#', '');
  const r = parseInt(tempHex.substring(0, 2), 16);
  const g = parseInt(tempHex.substring(2, 4), 16);
  const b = parseInt(tempHex.substring(4, 6), 16);

  return `rgba(${r},${g},${b},${opacity / 100})`;
}
