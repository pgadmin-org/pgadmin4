import React, { useRef, useMemo } from 'react';
import UplotReact from 'uplot-react';
import { useResizeDetector } from 'react-resize-detector';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import { useTheme } from '@material-ui/styles';

function tooltipPlugin(refreshRate) {
  let tooltipTopOffset = -20;
  let tooltipLeftOffset = 10;

  function showTooltip() {
    if(!window.uplotTooltip) {
      window.uplotTooltip = document.createElement('div');
      window.uplotTooltip.className = 'uplot-tooltip';
      document.body.appendChild(window.uplotTooltip);
    }
  }

  function hideTooltip() {
    window.uplotTooltip?.remove();
    window.uplotTooltip = null;
  }

  function setTooltip(u) {
    if(u.cursor.top <= 0) {
      hideTooltip();
      return;
    }

    if(u.legend?.values?.slice(1).every((v)=>v['_']=='')) {
      return;
    }

    showTooltip();

    let tooltipHtml=`<div>${(u.data[1].length-1-parseInt(u.legend.values[0]['_'])) * refreshRate + gettext(' seconds ago')}</div>`;
    for(let i=1; i<u.series.length; i++) {
      tooltipHtml += `<div class='uplot-tooltip-label'><div style='height:12px; width:12px; background-color:${u.series[i].stroke()}'></div> ${u.series[i].label}: ${u.legend.values[i]['_']}</div>`;
    }
    window.uplotTooltip.innerHTML = tooltipHtml;

    let overBBox = u.over.getBoundingClientRect();
    let tooltipBBox = window.uplotTooltip.getBoundingClientRect();
    let left = (tooltipLeftOffset + u.cursor.left + overBBox.left);
    /* Should not outside the graph right */
    if((left+tooltipBBox.width) > overBBox.right) {
      left = left - tooltipBBox.width - tooltipLeftOffset*2;
    }
    window.uplotTooltip.style.left = left + 'px';
    window.uplotTooltip.style.top = (tooltipTopOffset + u.cursor.top + overBBox.top) + 'px';
  }

  return {
    hooks: {
      setCursor: [
        u => {
          setTooltip(u);
        }
      ],
    }
  };
}

export default function StreamingChart({xRange=75, data, options, valueFormatter, showSecondAxis=false}) {
  const chartRef = useRef();
  const theme = useTheme();
  const { width, height, ref:containerRef } = useResizeDetector();

  const defaultOptions = useMemo(()=> {
    const series = [
      {},
      ...(data.datasets?.map((datum, index) => ({
        label: datum.label,
        stroke: datum.borderColor,
        value: valueFormatter ? (_u, t)=>valueFormatter(t) : undefined,
        width: options.lineBorderWidth ?? 1,
        scale: showSecondAxis && (index === 1) ? 'y1' : 'y',
        points: { show: options.showDataPoints ?? false, size: datum.pointHitRadius * 2 },
      })) ?? []),
    ];

    const axes = [
      {
        show: false,
        stroke: theme.palette.text.primary,
      },
    ];

    const yAxesValues = (self, values) => {
      if(valueFormatter && values) {
        return values.map((value) => {
          return valueFormatter(value);
        });
      }
      return values ?? [];
    };

    // ref: https://raw.githubusercontent.com/leeoniya/uPlot/master/demos/axis-autosize.html
    const yAxesSize = (self, values, axisIdx, cycleNum) => {
      let axis = self.axes[axisIdx];

      // bail out, force convergence
      if (cycleNum > 1)
        return axis._size;

      let axisSize = axis.ticks.size + axis.gap + 8;

      // find longest value
      let longestVal = (values ?? []).reduce((acc, val) => (
        val.length > acc.length ? val : acc
      ), '');

      if (longestVal != '') {
        self.ctx.font = axis.font[0];
        axisSize += self.ctx.measureText(longestVal).width / devicePixelRatio;
      }

      return Math.ceil(axisSize);
    };

    axes.push({
      scale: 'y',
      grid: {
        stroke: theme.otherVars.borderColor,
        width: 0.5,
      },
      stroke: theme.palette.text.primary,
      size: yAxesSize,
      values: valueFormatter ? yAxesValues : undefined,
    });

    if(showSecondAxis){
      axes.push({
        scale: 'y1',
        side: 1,
        stroke: theme.palette.text.primary,
        grid: {show: false},
        size: yAxesSize,
        values: valueFormatter ? yAxesValues : undefined,
      });
    }


    return {
      title: '',
      width: width,
      height: height,
      padding: [10, 0, 10, 0],
      focus: {
        alpha: 0.3,
      },
      cursor: {
        y: false,
        drag: {
          setScale: false,
        }
      },
      series: series,
      scales: {
        x: {
          time: false,
          auto: false,
          range: [0, xRange-1],
        }
      },
      axes: axes,
      plugins: options.showTooltip ? [tooltipPlugin(data.refreshRate)] : [],
    };
  }, [data.refreshRate, data?.datasets?.length, width, height, options]);

  const initialState = [
    Array.from(new Array(xRange).keys()),
    ...(data.datasets?.map((d)=>{
      let ret = new Array(xRange).fill(null);
      ret.splice(0, d.data.length, ...d.data);
      ret.reverse();
      return ret;
    })??{}),
  ];

  return (
    <div ref={containerRef} style={{width: '100%', height: '100%'}}>
      <UplotReact target={containerRef.current} options={defaultOptions} data={initialState} onCreate={(obj)=>{
        chartRef.current=obj;
      }} resetScales={false} />
    </div>
  );
}

const propTypeData = PropTypes.shape({
  datasets: PropTypes.array,
  refreshRate: PropTypes.number.isRequired,
});

StreamingChart.propTypes = {
  xRange: PropTypes.number.isRequired,
  data: propTypeData.isRequired,
  options: PropTypes.object,
  showSecondAxis: PropTypes.bool,
  valueFormatter: PropTypes.func,
};
