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
import PropTypes from 'prop-types';
import _ from 'lodash';

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
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
      borderWidth: 2,
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
      },
    },
    y: {
      min: 0,
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
  }
};

export default function BaseChart({type='line', id, options, data, redraw=false, ...props}) {
  const chartRef = React.useRef();
  const chartObj = React.useRef();
  let optionsMerged = _.merge(defaultOptions, options);

  const initChart = function() {
    Chart.register(...registerables);
    let chartContext = chartRef.current.getContext('2d');
    chartObj.current = new Chart(chartContext, {
      type: type,
      data: data,
      options: optionsMerged,
    });
    props.onInit && props.onInit(chartObj.current);
  };

  const destroyChart = function() {
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
};

export function LineChart(props) {
  return (
    <BaseChart {...props} type='line'/>
  );
}
