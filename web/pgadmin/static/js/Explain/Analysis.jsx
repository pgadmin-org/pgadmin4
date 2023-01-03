/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { makeStyles } from '@material-ui/styles';
import React from 'react';
import clsx from 'clsx';
import _ from 'lodash';
import ArrowRightAltIcon from '@material-ui/icons/ArrowRightAlt';
import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';
import HTMLReactParse from 'html-react-parser';
import { commonTableStyles } from '../Theme';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';

const useStyles = makeStyles((theme)=>({
  collapsible: {
    cursor: 'pointer',
  },
  collapseParent: {
    borderBottom: '2px dashed '+theme.palette.primary.main,
  },
  level2: {
    backgroundColor: theme.otherVars.explain.sev2.bg,
    color: theme.otherVars.explain.sev2.color,
  },
  level3: {
    backgroundColor: theme.otherVars.explain.sev3.bg,
    color: theme.otherVars.explain.sev3.color,
  },
  level4: {
    backgroundColor: theme.otherVars.explain.sev4.bg,
    color: theme.otherVars.explain.sev4.color,
  },
  textRight: {
    textAlign: 'right',
  },
}));

function getRowClassname(classes, data, collapseParent) {
  let className = [];
  if(data['Plans']?.length > 0) {
    className.push(classes.collapsible);
  }
  if(collapseParent) {
    className.push(classes.collapseParent);
  }
  return className;
}

function NodeText({displayText, extraInfo}) {
  return (
    <>
      <ArrowRightAltIcon fontSize="small" style={{marginLeft: '-24px'}} /> {displayText}
      {extraInfo?.length > 0 && <ul style={{fontSize: '13px'}}>
        {extraInfo.map((item, i)=>{
          return <li key={i} style={{opacity: '0.8'}}>{HTMLReactParse(item)}</li>;
        })}
      </ul>}
    </>);
}
NodeText.propTypes = {
  displayText: PropTypes.string,
  extraInfo: PropTypes.array,
};

function ExplainRow({row, show, activeExId, setActiveExId, collapsedExId, toggleCollapseExId}) {
  let data = row['data'];
  const classes = useStyles();
  const exId = `pga_ex_${data['level'].join('_')}`;
  const parentExId = `pga_ex_${data['parent_node']}`;
  const collapsed = collapsedExId.findIndex((v)=>parentExId.startsWith(v)) > -1;
  const className = getRowClassname(classes, data, collapsedExId.indexOf(exId) > -1);
  let onRowClick = (e)=>{
    toggleCollapseExId(e.currentTarget.getAttribute('data-ex-id'), data['Plans']?.length);
  };

  return (
    <tr onMouseEnter={(e)=>{setActiveExId(e.currentTarget.getAttribute('data-ex-id'));}}
      onMouseLeave={()=>{setActiveExId(null);}}
      className={clsx(className)} data-parent={parentExId}
      data-ex-id={`pga_ex_${data['level'].join('_')}`}
      style={collapsed ? {display: 'none'} : {}}
      onClick={onRowClick}>
      <td>
        <FiberManualRecordIcon fontSize="small" style={{visibility: activeExId==parentExId ? 'visible' : 'hidden'}} />
      </td>
      <td className={classes.textRight}>{data['_serial']}.</td>
      <td style={{paddingLeft: data['level'].length*30+'px'}} title={row['tooltip_text']}>
        <NodeText displayText={row['display_text']} extraInfo={row['node_extra_info']} />
      </td>
      <td className={clsx(classes.textRight, classes['level'+data['exclusive_flag']])} style={show.show_timings ? {} : {display: 'none'}}>
        {data['exclusive'] && (data['exclusive']+' ms')}
      </td>
      <td className={clsx(classes.textRight, classes['level'+data['inclusive_flag']])} style={show.show_timings ? {} : {display: 'none'}}>
        {data['inclusive'] && (data['inclusive']+' ms')}
      </td>
      <td className={clsx(classes.textRight, classes['level'+data['rowsx_flag']])} style={show.show_rowsx ? {} : {display: 'none'}}>
        {!_.isUndefined(data['rowsx_flag'])
          && (data['rowsx_direction'] == 'positive' ? <>&uarr;</> : <>&darr;</>)
        }&nbsp;{data['rowsx']}
      </td>
      <td className={classes.textRight} style={(show.show_rowsx || show.show_rows) ? {} : {display: 'none'}}>
        {data['Actual Rows']}
      </td>
      <td className={classes.textRight} style={(show.show_rowsx || show.show_plan_rows) ? {} : {display: 'none'}}>
        {data['Plan Rows']}
      </td>
      <td className={classes.textRight} style={(show.show_rowsx || show.show_rows) ? {} : {display: 'none'}}>
        {data['Actual Loops']}
      </td>
    </tr>
  );
}
ExplainRow.propTypes = {
  row: PropTypes.shape({
    data: PropTypes.shape({
      Plans: PropTypes.array,
      level: PropTypes.array,
      _serial: PropTypes.number,
      parent_node: PropTypes.number,
      exclusive: PropTypes.number,
      exclusive_flag: PropTypes.string,
      inclusive: PropTypes.number,
      inclusive_flag: PropTypes.string,
      rowsx_direction: PropTypes.string,
      rowsx: PropTypes.number,
      rowsx_flag: PropTypes.oneOfType([PropTypes.number,PropTypes.string]),
      'Actual Rows': PropTypes.number,
      'Plan Rows': PropTypes.number,
      'Actual Loops': PropTypes.number,
    }),
    node_extra_info: PropTypes.array,
    display_text: PropTypes.string,
    tooltip_text: PropTypes.string,
  }),
  show: PropTypes.shape({
    show_timings: PropTypes.bool,
    show_rowsx: PropTypes.bool,
    show_rows: PropTypes.bool,
    show_plan_rows: PropTypes.bool,
  }),
  activeExId: PropTypes.string,
  setActiveExId: PropTypes.func,
  collapsedExId: PropTypes.array,
  toggleCollapseExId: PropTypes.func,
};

export default function Analysis({explainTable}) {
  const tableClasses = commonTableStyles();
  const [activeExId, setActiveExId] = React.useState();
  const [collapsedExId, setCollapsedExId] = React.useState([]);

  const toggleCollapseExId = (exId, hasPlans=true)=>{
    if(hasPlans) {
      setCollapsedExId((prev)=>{
        if(prev.indexOf(exId) > -1) {
          return prev.filter((v)=>v!=exId);
        }
        return [...prev, exId];
      });
    }
  };
  return <table className={clsx(tableClasses.table, tableClasses.noBorder, tableClasses.borderBottom)}>
    <thead>
      <tr>
        <th rowSpan="2" style={{width: '30px'}}></th>
        <th rowSpan="2"><button disabled="">#</button></th>
        <th rowSpan="2"><button disabled="">Node</button></th>
        <th colSpan="2" style={explainTable.show_timings ? {} : {display: 'none'}}>
          <button disabled="">{gettext('Timings')}</button>
        </th>
        <th style={(explainTable.show_rowsx || explainTable.show_rows || explainTable.show_plan_rows) ? {} : {display: 'none'}}
          colSpan={(explainTable.show_rowsx) ? '3' : '1'}>
          <button disabled="">{gettext('Rows')}</button>
        </th>
        <th style={(explainTable.show_rowsx || explainTable.show_rows) ? {} : {display: 'none'}} rowSpan="2">
          <button disabled="">{gettext('Loops')}</button>
        </th>
      </tr>
      <tr>
        <th style={explainTable.show_timings ? {} : {display: 'none'}}>
          <button disabled="">{gettext('Exclusive')}</button>
        </th>
        <th style={explainTable.show_timings ? {} : {display: 'none'}}>
          <button disabled="">{gettext('Inclusive')}</button>
        </th>
        <th style={explainTable.show_rowsx ? {} : {display: 'none'}}><button disabled="">{gettext('Rows X')}</button></th>
        <th style={(explainTable.show_rowsx || explainTable.show_rows) ? {} : {display: 'none'}}><button disabled="">{gettext('Actual')}</button></th>
        <th style={(explainTable.show_rowsx || explainTable.show_plan_rows) ? {} : {display: 'none'}}><button disabled="">{gettext('Plan')}</button></th>
      </tr>
    </thead>
    <tbody>
      {_.sortBy(explainTable.rows,(r)=>r['data']['_serial']).map((row, i)=>{
        return <ExplainRow key={i} row={row} show={{
          show_timings: explainTable.show_timings,
          show_rowsx: explainTable.show_rowsx,
          show_rows: explainTable.show_rows,
          show_plan_rows: explainTable.show_plan_rows,
        }} activeExId={activeExId} setActiveExId={setActiveExId} collapsedExId={collapsedExId} toggleCollapseExId={toggleCollapseExId} />;
      })}
    </tbody>
  </table>;
}

Analysis.propTypes = {
  explainTable: PropTypes.object,
};
