/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import clsx from 'clsx';
import gettext from 'sources/gettext';

import React, { useState } from 'react';

import { makeStyles } from '@material-ui/styles';
import TableContainer from '@material-ui/core/TableContainer';
import Paper from '@material-ui/core/Paper';

import { DebuggerEventsContext } from './DebuggerComponent';
import { DEBUGGER_EVENTS } from '../DebuggerConstants';
import { commonTableStyles } from '../../../../../static/js/Theme';
import { InputText } from '../../../../../static/js/components/FormComponents';


const useStyles = makeStyles(() => ({
  table: {
    minWidth: 650,
  },
  summaryContainer: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'auto',
    maxHeight: '100%'
  },
  container: {
    maxHeight: '100%'
  }
}));

export function Stack() {
  const classes = useStyles();
  const tableClasses = commonTableStyles();
  const eventBus = React.useContext(DebuggerEventsContext);
  const [stackData, setStackData] = useState([]);
  const [disableFrameSelection, setDisableFrameSelection] = useState(false);
  
  React.useEffect(() => {
    eventBus.registerListener(DEBUGGER_EVENTS.SET_STACK, (stackValues) => {
      setStackData(stackValues);
    });
    eventBus.registerListener(DEBUGGER_EVENTS.GET_TOOL_BAR_BUTTON_STATUS, (status) => {
      setDisableFrameSelection(status.disabled);
    });
  }, []);
  return (
    <Paper variant="outlined" elevation={0} className={classes.summaryContainer}>
      <TableContainer className={classes.container}>
        <table className={clsx(tableClasses.table)} aria-label="sticky table">
          <thead>
            <tr>
              <th>{gettext('Name')}</th>
              <th>{gettext('Value')}</th>
              <th>{gettext('Line No.')}</th>
            </tr>
          </thead>
          <tbody>
            {stackData?.map((row, index) => (
              <tr key={_.uniqueId('c')}>
                <td>
                  {row.targetname}
                </td>
                <td>{row.args}</td>
                <td>
                  <InputText data-test='stack-select-frame' value={row.linenumber} readonly={true} disabled={disableFrameSelection} onClick={() => { if(!disableFrameSelection)eventBus.fireEvent(DEBUGGER_EVENTS.SET_FRAME, index);}}></InputText>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableContainer>
    </Paper>
  );
}
