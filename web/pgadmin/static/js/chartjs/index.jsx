/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { useTheme } from '@mui/material';

export const DATA_POINT_STYLE = ['circle', 'cross', 'crossRot', 'rect',
  'rectRounded', 'rectRot', 'star', 'triangle'];
export const DATA_POINT_SIZE = 3;

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
      },
    },
    y: {
      ticks: {
        callback: function(label) {
          if (Math.floor(label) === label) {
            return label;
          }
        },
      },
      grid: {
        drawBorder: false,
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

export default function BaseChart({type='line', id, options, data, redraw=false, plugins={}, ...props}) {
  const chartRef = React.useRef();
  const chartObj = React.useRef();
  const theme = useTheme();

  const initChart = function() {
    Chart.register(...registerables);
    // Register for Zoom Plugin
    Chart.register(zoomPlugin);
    let chartContext = chartRef.current.getContext('2d');
    chartObj.current = new Chart(chartContext, {
      type: type,
      data: data,
      plugins: [plugins],
      options: options,
    });
    props.onInit?.(chartObj.current);
  };

  const destroyChart = function() {
    chartObj.current?.resetZoom?.();
    chartObj.current?.destroy();
  };

  useEffect(()=>{
    initChart();
    return destroyChart;
  }, []);

  useEffect(()=>{
    let scaleColors = {
      scales: {
        x: {
          ticks: {
            color: theme.palette.text.primary,
          },
        },
        y: {
          ticks: {
            color: theme.palette.text.primary,
          },
          grid: {
            zeroLineColor: theme.otherVars.borderColor,
            color: theme.otherVars.borderColor
          },
        },
      },
    };
    let merged = options;
    // Override only if scales are actually defined.
    if(options.scales && Object.keys(options.scales).length > 0) {
      merged = _.merge(options, scaleColors);
    }
    chartObj.current.options = merged;
    chartObj.current.update(props.updateOptions || {});
  },[theme]);

  useEffect(()=>{
    if(typeof(chartObj.current) != 'undefined') {
      chartObj.current.data = data;
      for(let i=0; i<chartObj.current.data.datasets.length; i++) {
        chartObj.current.data.datasets[i] = {
          ...chartObj.current.data.datasets[i],
          ...data.datasets[i],
        };
      }
      chartObj.current.options = options;
      chartObj.current.update(props.updateOptions || {});
      props.onUpdate?.(chartObj.current);
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

export function LineChart({stacked, options, ...props}) {
  // if stacked true then merge the stacked specific options.
  let optionsMerged = _.merge(defaultOptions, options, stacked ? stackedOptions : {});
  return (
    <BaseChart {...props} options={optionsMerged} type='line'/>
  );
}
LineChart.propTypes = {
  options: PropTypes.object,
  stacked: PropTypes.bool
};

export function BarChart({stacked, options, ...props}) {
  // if stacked true then merge the stacked specific options.
  let optionsMerged = _.merge(defaultOptions, options, stacked ? stackedOptions : {});
  return (
    <BaseChart {...props} options={optionsMerged} type='bar'/>
  );
}
BarChart.propTypes = {
  options: PropTypes.object,
  stacked: PropTypes.bool
};

export function PieChart({options, ...props}) {
  let optionsMerged = _.merge({
    responsive: true,
    maintainAspectRatio: false,
    normalized: true,
  }, options);
  return (
    <BaseChart {...props} options={optionsMerged} type='pie'/>
  );
}
PieChart.propTypes = {
  options: PropTypes.object
};

export function ConvertHexToRGBA(hex, opacity) {
  const tempHex = hex.replace('#', '');
  const r = parseInt(tempHex.substring(0, 2), 16);
  const g = parseInt(tempHex.substring(2, 4), 16);
  const b = parseInt(tempHex.substring(4, 6), 16);

  return `rgba(${r},${g},${b},${opacity / 100})`;
}

// This function is used to Lighten/Darken color.
export function LightenDarkenColor(color, amount) {
  let usePound = false;
  if (color[0] == '#') {
    color = color.slice(1);
    usePound = true;
  }

  let num = parseInt(color, 16);

  let r = (num >> 16) + amount;
  if (r > 255) {
    r = 255;
  } else if (r < 0) {
    r = 0;
  }

  let b = ((num >> 8) & 0x00FF) + amount;
  if (b > 255) {
    b = 255;
  } else if (b < 0) {
    b = 0;
  }

  let g = (num & 0x0000FF) + amount;
  if (g > 255) {
    g = 255;
  } else if (g < 0) {
    g = 0;
  }

  return (usePound?'#':'') + (g | (b << 8) | (r << 16)).toString(16);
}
