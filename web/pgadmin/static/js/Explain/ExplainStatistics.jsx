/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import { Box, Grid, makeStyles } from '@material-ui/core';
import gettext from 'sources/gettext';
import { commonTableStyles } from '../Theme';
import clsx from 'clsx';
import _ from 'lodash';
import PropTypes from 'prop-types';

const useStyles = makeStyles((theme)=>({
  title: {
    fontWeight: 'bold',
    padding: '4px',
    backgroundColor: theme.otherVars.cardHeaderBg,
    borderTopLeftRadius: theme.shape.borderRadius,
    borderTopRightRadius: theme.shape.borderRadius,
  },
  tableRow: {
    backgroundColor: theme.palette.grey[200]
  },
  tableName:{
    fontWeight: 'bold',
  },
  nodeName: {
    paddingLeft: '30px',
  },
}));

export default function ExplainStatistics({explainTable}) {
  // _renderStatisticsTable
  const classes = useStyles();
  const tableClasses = commonTableStyles();
  return (
    <Box p={1}>
      <Grid container spacing={1}>
        <Grid item lg={6} md={12}>
          <div className={classes.title}>{gettext('Statistics per Node Type')}</div>
          <table className={clsx(tableClasses.table)}>
            <thead>
              <tr>
                <th>{gettext('Node type')}</th>
                <th>{gettext('Count')}</th>
                {explainTable.show_timings && <>
                  <th>{gettext('Time spent')}</th>
                  <th>{'% '+gettext('of query')}</th>
                </>}
              </tr>
            </thead>
            <tbody>
              {_.sortBy(Object.keys(explainTable.statistics.nodes)).map((key, i)=>{
                let node = explainTable.statistics.nodes[key];
                return <tr key={i}>
                  <td>{node.name}</td>
                  <td>{node.count}</td>
                  {explainTable.show_timings && <>
                    <td>{Math.ceil10(node.sum_of_times, -3) + ' ms'}</td>
                    <td>{Math.ceil10(((node.sum_of_times||0)/(explainTable.total_time||1)) * 100, -2)+ '%'}</td>
                  </>}
                </tr>;
              })}
            </tbody>
          </table>
        </Grid>
        <Grid item lg={6} md={12}>
          <div className={classes.title}>{gettext('Statistics per Relation')}</div>
          <table className={clsx(tableClasses.table)}>
            <thead>
              <tr>
                <th>{gettext('Relation name')}</th>
                <th>{gettext('Scan count')}</th>
                {explainTable.show_timings && <>
                  <th>{gettext('Total time')}</th>
                  <th>{'% '+gettext('of query')}</th>
                </>}
              </tr>
              <tr>
                <th>{gettext('Node type')}</th>
                <th>{gettext('Count')}</th>
                {explainTable.show_timings && <>
                  <th>{gettext('Sum of times')}</th>
                  <th>{'% '+gettext('of relation')}</th>
                </>}
              </tr>
            </thead>
            <tbody>
              {_.sortBy(Object.keys(explainTable.statistics.tables)).map((key, i)=>{
                let table = explainTable.statistics.tables[key];
                table.sum_of_times = _.sumBy(Object.values(table.nodes), 'sum_of_times');
                return <React.Fragment key={i}>
                  <tr className={classes.tableRow}>
                    <td className={classes.tableName}>{table.name}</td>
                    <td>{table.count}</td>
                    {explainTable.show_timings && <>
                      <td>{Math.ceil10(table.sum_of_times, -3) + ' ms'}</td>
                      <td>{Math.ceil10(((table.sum_of_times||0)/(explainTable.total_time||1)) * 100, -2)+ '%'}</td>
                    </>}
                  </tr>
                  {_.sortBy(Object.keys(table.nodes)).map((nodeKey, j)=>{
                    let node = table.nodes[nodeKey];
                    return <tr key={j}>
                      <td><div className={classes.nodeName}>{node.name}</div></td>
                      <td>{node.count}</td>
                      {explainTable.show_timings && <>
                        <td>{Math.ceil10(node.sum_of_times, -3) + ' ms'}</td>
                        <td>{Math.ceil10(((node.sum_of_times||0)/(table.sum_of_times||1)) * 100, -2)+ '%'}</td>
                      </>}
                    </tr>;
                  })}
                </React.Fragment>;
              })}
            </tbody>
          </table>
        </Grid>
      </Grid>
    </Box>
  );
}

ExplainStatistics.propTypes = {
  explainTable: PropTypes.shape({
    show_timings: PropTypes.bool,
    statistics: PropTypes.shape({
      nodes: PropTypes.object,
      tables: PropTypes.object,
    }),
    total_time: PropTypes.number,
  }),
};
