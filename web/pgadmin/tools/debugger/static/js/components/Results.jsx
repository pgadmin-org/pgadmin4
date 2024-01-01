/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import _ from 'lodash';
import clsx from 'clsx';

import React, { useState } from 'react';

import { makeStyles } from '@material-ui/styles';
import Paper from '@material-ui/core/Paper';

import { DebuggerEventsContext } from './DebuggerComponent';
import { DEBUGGER_EVENTS } from '../DebuggerConstants';
import { commonTableStyles } from '../../../../../static/js/Theme';


const useStyles = makeStyles(() => ({
  table: {
    minWidth: 650,
  },
  summaryContainer: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'auto',
  }
}));

export function Results() {
  const classes = useStyles();
  const tableClasses = commonTableStyles();
  const eventBus = React.useContext(DebuggerEventsContext);
  const [resultData, setResultData] = useState([]);
  const [columns, setColumns] = useState([]);
  React.useEffect(() => {
    eventBus.registerListener(DEBUGGER_EVENTS.SET_RESULTS, (columnsData, values) => {
      setResultData(values);
      setColumns(columnsData);
    });
  }, []);
  return (
    <Paper variant="outlined" elevation={0} className={classes.summaryContainer}>
      <table className={clsx(tableClasses.table)}>
        <thead>
          <tr key={_.uniqueId('c')}>
            {
              columns.map((col) => (
                <th key={col.name}>{col.name}</th>
              ))
            }
          </tr>
        </thead>
        <tbody>
          {resultData.map((row) => (
            <tr key={_.uniqueId('c')}>
              {
                columns.map((col) => (
                  <td key={_.uniqueId('c')}>{row[col.name]}</td>
                ))
              }
            </tr>
          ))}
        </tbody>
      </table>
    </Paper>
  );
}
