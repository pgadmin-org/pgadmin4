/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useEffect } from 'react';
import Chart from 'chart.js';
import PropTypes from 'prop-types';

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
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
  hover: {
    animationDuration:0,
  },
};

export default function BaseChart({type='line', id, options, data, redraw=false, ...props}) {
  const chartRef = React.useRef();
  const chartObj = React.useRef();
  let optionsMerged = Chart.helpers.configMerge(defaultOptions, options);

  const initChart = function() {
    let chartContext = chartRef.current.getContext('2d');
    chartObj.current = new Chart(chartContext, {
      type: type,
      data: data,
      options: optionsMerged,
    });
    props.onInit && props.onInit(chartObj.current);
  }

  const destroyChart = function() {
    chartObj.current && chartObj.current.destroy();
  }

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
  }, [redraw])

  return (
    <canvas id={id} ref={chartRef}></canvas>
  );
}

BaseChart.propTypes = {
  type: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
  options: PropTypes.object,
  updateOptions: PropTypes.object,
  onInit: PropTypes.func,
  onUpdate: PropTypes.func,
};

export function LineChart(props) {
  return (
    <BaseChart {...props} type='line'/>
  );
}