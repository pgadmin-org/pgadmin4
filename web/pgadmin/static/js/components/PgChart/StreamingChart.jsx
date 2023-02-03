import React, { useRef, useMemo } from 'react';
import UplotReact from 'uplot-react';
import { useResizeDetector } from 'react-resize-detector';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';

function tooltipPlugin(refreshRate) {
  let tooltipTopOffset = -20;
  let tooltipLeftOffset = 10;
  let tooltip;

  function showTooltip() {
    if(!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'uplot-tooltip';
      tooltip.style.display = 'block';
      document.body.appendChild(tooltip);
    }
  }

  function hideTooltip() {
    tooltip?.remove();
    tooltip = null;
  }

  function setTooltip(u) {
    if(u.cursor.top <= 0) {
      hideTooltip();
      return;
    }
    showTooltip();
    let tooltipHtml=`<div>${(u.data[1].length-1-parseInt(u.legend.values[0]['_'])) * refreshRate + gettext(' seconds ago')}</div>`;
    for(let i=1; i<u.series.length; i++) {
      tooltipHtml += `<div class="uplot-tooltip-label"><div style="height:12px; width:12px; background-color:${u.series[i].stroke()}"></div> ${u.series[i].label}: ${u.legend.values[i]['_']}</div>`;
    }
    tooltip.innerHTML = tooltipHtml;

    let overBBox = u.over.getBoundingClientRect();
    let tooltipBBox = tooltip.getBoundingClientRect();
    let left = (tooltipLeftOffset + u.cursor.left + overBBox.left);
    /* Should not outside the graph right */
    if((left+tooltipBBox.width) > overBBox.right) {
      left = left - tooltipBBox.width - tooltipLeftOffset*2;
    }
    tooltip.style.left = left + 'px';
    tooltip.style.top = (tooltipTopOffset + u.cursor.top + overBBox.top) + 'px';
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

export default function StreamingChart({xRange=75, data, options}) {
  const chartRef = useRef();
  const { width, height, ref:containerRef } = useResizeDetector();
  const defaultOptions = useMemo(()=>({
    title: '',
    width: width,
    height: height,
    padding: [10, 0, 10, 0],
    focus: {
      alpha: 0.3,
    },
    cursor: {
      drag: {
        setScale: false,
      }
    },
    series: [
      {},
      ...data.datasets?.map((datum)=>({
        label: datum.label,
        stroke: datum.borderColor,
        width: options.lineBorderWidth ?? 1,
        points: { show: options.showDataPoints ?? false, size: datum.pointHitRadius*2 }
      }))
    ],
    scales: {
      x: {
        time: false,
      }
    },
    axes: [
      {
        show: false,
      },
    ],
    plugins: options.showTooltip ? [tooltipPlugin(data.refreshRate)] : [],
  }), [data.refreshRate, data?.datasets?.length, width, height, options]);

  const initialState = [
    Array.from(new Array(xRange).keys()),
    ...data.datasets?.map((d)=>{
      let ret = [...d.data];
      ret.reverse();
      return ret;
    }),
  ];

  chartRef.current?.setScale('x', {min: data.datasets[0]?.data?.length-xRange, max: data.datasets[0]?.data?.length-1});
  return (
    <div ref={containerRef} style={{width: '100%', height: '100%'}}>
      <UplotReact target={containerRef.current} options={defaultOptions} data={initialState} onCreate={(obj)=>chartRef.current=obj} />
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
};
