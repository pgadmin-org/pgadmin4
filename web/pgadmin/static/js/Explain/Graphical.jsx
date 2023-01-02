/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { Box, Card, CardContent, CardHeader, makeStyles, useTheme } from '@material-ui/core';
import React, {useEffect} from 'react';
import _ from 'lodash';
import { PgButtonGroup, PgIconButton } from '../components/Buttons';
import ZoomInIcon from '@material-ui/icons/ZoomIn';
import ZoomOutIcon from '@material-ui/icons/ZoomOut';
import ZoomOutMapIcon from '@material-ui/icons/ZoomOutMap';
import SaveAltIcon from '@material-ui/icons/SaveAlt';
import gettext from 'sources/gettext';
import ReactDOMServer from 'react-dom/server';
import url_for from 'sources/url_for';
import { downloadSvg } from './svg_download';
import CloseIcon from '@material-ui/icons/CloseRounded';
import { commonTableStyles } from '../Theme';
import clsx from 'clsx';
import PropTypes from 'prop-types';

// Some predefined constants used to calculate image location and its border
let pWIDTH = 100.;
let pHEIGHT = 100.;
let IMAGE_WIDTH = 50;
let IMAGE_HEIGHT = 50;
let ARROW_WIDTH = 10,
  ARROW_HEIGHT = 10;
let TXT_ALIGN = 5,
  TXT_SIZE = '15px';
let xMargin = 25,
  yMargin = 25;
let MIN_ZOOM_FACTOR = 0.3,
  MAX_ZOOM_FACTOR = 2,
  INIT_ZOOM_FACTOR = 1;
let ZOOM_RATIO = 0.05;

const AUXILIARY_KEYS = ['image', 'Plans', 'level', 'image_text', 'xpos', 'ypos', 'width', 'height', 'total_time', 'parent_node', '_serial', 'arr_id'];

function PolyLine({startx, starty, endx, endy, opts, arrowOpts}) {
  // Calculate end point of first starting straight line (startx1, starty1)
  // Calculate start point of 2nd straight line (endx1, endy1)
  let midX1 = startx + ((endx - startx) / 3),
    midX2 = startx + (2 * ((endx - startx) / 3));
  return (
    <>
      <line x1={startx} x2={midX1} y1={starty} y2={starty} {...opts}></line>
      <line x1={midX1-1} x2={midX2} y1={starty} y2={endy} {...opts}></line>
      <line x1={midX2} x2={endx} y1={endy} y2={endy} {...opts} {...arrowOpts}></line>
    </>
  );
}
PolyLine.propTypes = {
  startx: PropTypes.number,
  starty: PropTypes.number,
  endx: PropTypes.number,
  endy: PropTypes.number,
  opts: PropTypes.object,
  arrowOpts: PropTypes.object,
};

function Multitext({currentXpos, currentYpos, label, maxWidth}) {
  const theme = useTheme();
  let abc = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let xmlns = 'http://www.w3.org/2000/svg';
  let svgElem = document.createElementNS(xmlns, 'svg');
  svgElem.setAttributeNS(xmlns, 'height', '100%');
  svgElem.setAttributeNS(xmlns, 'width', '100%');
  let text = document.createElementNS(xmlns, 'text');
  text.innerHTML = abc;
  text.setAttributeNS(xmlns, 'x', 0);
  text.setAttributeNS(xmlns, 'y', 0);
  let attributes={
    'font-size': TXT_SIZE,
    'text-anchor': 'middle',
    'fill': theme.palette.text.primary,
  };
  Object.keys(attributes).forEach((key)=>{
    text.setAttributeNS(xmlns, key, attributes[key]);
  });
  svgElem.appendChild(text);
  document.body.appendChild(svgElem);
  /*
  * Find letter width in pixels and
  * index from where the text should be broken
  */
  let letterWidth = text.getBBox().width / abc.length,
    wordBreakIndex = Math.round((maxWidth / letterWidth)) - 1;
  svgElem.remove();

  let words = label.split(' '),
    widthSoFar = 0,
    lines = [],
    currLine = '',
    /*
    * Function to divide string into multiple lines
    * and store them in an array if it size crosses
    * the max-width boundary.
    */
    splitTextInMultiLine = function(leading, so_far, line) {
      let l = line.length,
        res = [];

      if (l == 0)
        return res;

      if (so_far && (so_far + (l * letterWidth) > maxWidth)) {
        res.push(leading);
        res = res.concat(splitTextInMultiLine('', 0, line));
      } else if (so_far) {
        res.push(leading + ' ' + line);
      } else {
        if (leading)
          res.push(leading);
        if (line.length > wordBreakIndex + 1)
          res.push(line.slice(0, wordBreakIndex) + '-');
        else
          res.push(line);
        res = res.concat(splitTextInMultiLine('', 0, line.slice(wordBreakIndex)));
      }

      return res;
    };

  for (let i = 0; i < words.length; i++) {
    let tmpArr = splitTextInMultiLine(
      currLine, widthSoFar, words[i]
    );

    if (currLine) {
      lines = lines.slice(0, lines.length - 1);
    }
    lines = lines.concat(tmpArr);
    currLine = lines[lines.length - 1];
    widthSoFar = (currLine.length * letterWidth);
  }

  return (
    <text x={currentXpos} y={currentYpos} fill={theme.palette.text.primary} style={{fontSize: TXT_SIZE, textAnchor: 'middle'}}>
      {lines.map((line, i)=>{
        if(i > 0) {
          return <tspan key={i} dy="1.2em" x={currentXpos}>{line}</tspan>;
        }
        return <tspan key={i}>{line}</tspan>;
      })}
    </text>
  );
}

Multitext.propTypes = {
  currentXpos: PropTypes.number,
  currentYpos: PropTypes.number,
  label: PropTypes.string,
  maxWidth: PropTypes.number,
};
function Image({plan, label, currentXpos, currentYpos, content, download, onNodeClick}) {
  return (
    <>
      <image href={content}
        preserveAspectRatio="none"
        x={currentXpos + (pWIDTH - IMAGE_WIDTH) / 2}
        y={currentYpos + (pHEIGHT - IMAGE_HEIGHT) / 2}
        width={IMAGE_WIDTH} height={IMAGE_HEIGHT}
        style={{cursor: 'pointer'}} onClick={onNodeClick}>
        {download &&
          <title>
            <NodeDetails plan={plan} download={true} />
          </title>
        }
      </image>
      <Multitext currentXpos={currentXpos + (pWIDTH / 2) + TXT_ALIGN} currentYpos={currentYpos + pHEIGHT - TXT_ALIGN} label={label} maxWidth={150} />
    </>
  );
}

Image.propTypes = {
  plan: PropTypes.object,
  label: PropTypes.string,
  currentXpos: PropTypes.number,
  currentYpos: PropTypes.number,
  content: PropTypes.string,
  download: PropTypes.bool,
  onNodeClick: PropTypes.func,
};
function NodeDetails({plan, download=false}) {
  return <>
    {Object.keys(plan).map((key)=>{
      if(AUXILIARY_KEYS.indexOf(key) != -1) {
        return <></>;
      }
      if(download) {
        return `${key}: ${plan[key]}\n`;
      } else {
        return (<tr key={key}>
          <td>{_.escape(key)}</td>
          <td>{_.escape(plan[key])}</td>
        </tr>);
      }
    })}
  </>;
}
NodeDetails.propTypes = {
  plan: PropTypes.object,
  download: PropTypes.bool,
};

function PlanContent({plan, pXpos, pYpos, ...props}) {
  const theme = useTheme();
  let currentXpos = props.xpos + plan.xpos,
    currentYpos = props.ypos + plan.ypos,
    isSubPlan = (plan['Parent Relationship'] === 'SubPlan');
  const nodeLabel = plan.Schema == undefined ?
    plan.image_text : plan.Schema + '.' + plan.image_text;

  let polylineProps = null;
  if(!_.isUndefined(pYpos)) {
    let arrowSize = props.ctx.arrows[plan['arr_id']];
    polylineProps = {
      startx: currentXpos + pWIDTH,
      starty: currentYpos + (pHEIGHT / 2),
      endx: pXpos - ARROW_WIDTH,
      endy: pYpos + (pHEIGHT / 2),
      arr_id: plan['arr_id'],
    };
    polylineProps.opts = {
      stroke: theme.palette.text.primary,
      strokeWidth: arrowSize + 2,
    };
    polylineProps.arrowOpts = {
      style: {
        markerEnd: `url("#${plan['arr_id']}")`,
      }
    };
  }
  return (
    <>
      <g>
        {isSubPlan &&
      <>
        <rect x={currentXpos - plan.width + pWIDTH + xMargin}
          y={currentYpos - plan.height + pHEIGHT + yMargin - TXT_ALIGN}
          width={plan.width - xMargin}
          height={plan.height + (currentYpos - yMargin)}
          rx={5}
          stroke="#444444"
          strokeWidth={1.2}
          fill="gray"
          fillOpacity={0.2}
          pointerEvents="none"
        />
        <tspan x={currentXpos + pWIDTH - (plan.width / 2) - xMargin}
          y={currentYpos + pHEIGHT - (plan.height / 2) - yMargin}
          fontSize={TXT_SIZE}
          textAnchor="start"
          fill="red"
        >{plan['Subplan Name']}</tspan>
      </>}
        <Image
          label={nodeLabel}
          content={url_for('misc.index') + 'static/explain/img/' + plan.image}
          currentXpos={currentXpos}
          currentYpos={currentYpos}
          plan={plan}
          download={props.download}
          onNodeClick={()=>props.onNodeClick(nodeLabel, plan)}
        />
        {polylineProps && <PolyLine {...polylineProps} />}
      </g>
      {plan['Plans'].map((p, i)=>(
        <PlanContent key={i} plan={p} pXpos={currentXpos} pYpos={currentYpos} {...props}/>
      ))}
    </>
  );
}

PlanContent.propTypes = {
  plan: PropTypes.object,
  pXpos: PropTypes.number,
  pYpos: PropTypes.number,
  xpos: PropTypes.number,
  ypos: PropTypes.number,
  ctx: PropTypes.object,
  download: PropTypes.bool,
  onNodeClick: PropTypes.func,
};

function PlanSVG({planData, zoomFactor, fitZoomFactor, ...props}) {
  const theme = useTheme();
  useEffect(()=>{
    fitZoomFactor && fitZoomFactor(planData.width);
  }, [planData.width]);

  return (
    <svg height={planData.height*zoomFactor} width={planData.width*zoomFactor} version="1.1" xmlns="https://www.w3.org/2000/svg">
      <defs>
        {Object.keys(props.ctx.arrows).map((arr_id, i)=>{
          let arrowPoints = [
            0, 0,
            0, (ARROW_WIDTH / 2),
            ARROW_HEIGHT, (ARROW_WIDTH / 4),
            0, 0
          ].join(',');
          let viewBox = [0, 0, 2 * ARROW_WIDTH, 2 * ARROW_HEIGHT].join(' ');
          return(
            <marker key={i} viewBox={viewBox} markerWidth={ARROW_WIDTH} markerHeight={ARROW_HEIGHT} orient="auto" refX="0" refY={ARROW_WIDTH / 4} id={arr_id}>
              <polygon points={arrowPoints} fill={theme.palette.text.primary}></polygon>
            </marker>
          );
        })}
      </defs>
      <g transform={`matrix(${zoomFactor},0,0,${zoomFactor},0,0)`}>
        <rect x="0" y="0" width={planData.width} height={planData.height} rx="5" ry="5" fill={theme.palette.background.default}></rect>
        <PlanContent plan={planData['Plan']} xpos={planData.width - xMargin} ypos={yMargin} {...props}/>
      </g>
    </svg>
  );
}

PlanSVG.propTypes = {
  planData: PropTypes.object,
  zoomFactor: PropTypes.number,
  fitZoomFactor: PropTypes.func,
  ctx: PropTypes.object,
};


const useStyles = makeStyles((theme)=>({
  explainDetails: {
    minWidth: '200px',
    maxWidth: '300px',
    position: 'absolute',
    top: '0.25rem',
    bottom: '0.25rem',
    right: '0.25rem',
    borderColor: theme.otherVars.borderColor,
    // box-shadow: 0 0.125rem 0.5rem rgb(132 142 160 / 28%);
    wordBreak: 'break-all',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 99,
  },
  explainContent: {
    height: '100%',
    overflow: 'auto',
  }
}));

export default function Graphical({planData, ctx}) {
  const tableStyles = commonTableStyles();
  const classes = useStyles();
  const graphContainerRef = React.useRef();
  const [zoomFactor, setZoomFactor] = React.useState(INIT_ZOOM_FACTOR);
  const [[explainPlanTitle, explainPlanDetails], setExplainPlanDetails] = React.useState([null, null]);

  const onCmdClick = (cmd)=>{
    if(cmd == 'in') {
      setZoomFactor((prev)=>{
        if(prev >= MAX_ZOOM_FACTOR) return prev;
        return prev+ZOOM_RATIO;
      });
    } else if(cmd == 'out') {
      setZoomFactor((prev)=>{
        if(prev <= MIN_ZOOM_FACTOR) return prev;
        return prev-ZOOM_RATIO;
      });
    } else {
      setZoomFactor(INIT_ZOOM_FACTOR);
    }
  };

  const fitZoomFactor = React.useCallback((svgWidth)=>{
    /*
    * Scale graph in case its width is bigger than panel width
    * in which the graph is displayed
    */
    if(graphContainerRef.current.offsetWidth && svgWidth) {
      let zoomFactor = graphContainerRef.current.offsetWidth/svgWidth;
      zoomFactor = zoomFactor < MIN_ZOOM_FACTOR ? MIN_ZOOM_FACTOR : zoomFactor;
      zoomFactor = zoomFactor > INIT_ZOOM_FACTOR ? INIT_ZOOM_FACTOR : zoomFactor;
      setZoomFactor(zoomFactor);
    }
  }, []);

  const onDownloadClick = ()=>{
    downloadSvg(ReactDOMServer.renderToStaticMarkup(
      <PlanSVG planData={planData} download={true} ctx={ctx} zoomFactor={INIT_ZOOM_FACTOR} onNodeClick={()=>{/*This is intentional (SonarQube)*/}}/>
    ), 'explain_plan_' + (new Date()).getTime() + '.svg');
  };

  const onNodeClick = React.useCallback((title, details)=>{
    setExplainPlanDetails([title, details]);
  }, []);

  return (
    <Box ref={graphContainerRef} height="100%" width="100%" overflow="auto">
      <Box position="absolute" top="4px" left="4px" gridGap="4px" display="flex">
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Zoom in')} icon={<ZoomInIcon />} onClick={()=>onCmdClick('in')}/>
          <PgIconButton title={gettext('Zoom to original')} icon={<ZoomOutMapIcon />} onClick={()=>onCmdClick()}/>
          <PgIconButton title={gettext('Zoom out')} icon={<ZoomOutIcon />} onClick={()=>onCmdClick('out')}/>
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Download')} icon={<SaveAltIcon />} onClick={onDownloadClick}/>
        </PgButtonGroup>
      </Box>
      <PlanSVG planData={planData} ctx={ctx} zoomFactor={zoomFactor} fitZoomFactor={fitZoomFactor}
        onNodeClick={onNodeClick}
      />
      {Boolean(explainPlanDetails) &&
      <Card className={classes.explainDetails} data-label="explain-details">
        <CardHeader title={<Box display="flex">
          {explainPlanTitle}
          <Box marginLeft="auto">
            <PgIconButton title={gettext('Close')} icon={<CloseIcon />} size="xs" noBorder onClick={()=>setExplainPlanDetails([null, null])}/>
          </Box>
        </Box>} />
        <CardContent className={classes.explainContent}>
          <table className={clsx(tableStyles.table, tableStyles.borderBottom, tableStyles.wrapTd)}>
            <tbody>
              <NodeDetails download={false} plan={explainPlanDetails} />
            </tbody>
          </table>
        </CardContent>
      </Card>}
    </Box>
  );
}

Graphical.propTypes = {
  planData: PropTypes.object,
  ctx: PropTypes.object,
};
