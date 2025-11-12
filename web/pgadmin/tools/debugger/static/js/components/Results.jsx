/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import _ from 'lodash';
import { styled } from '@mui/material/styles';
import React, { useState } from 'react';

import Paper from '@mui/material/Paper';

import { DebuggerEventsContext } from './DebuggerComponent';
import { DEBUGGER_EVENTS } from '../DebuggerConstants';
import Table from '../../../../../static/js/components/Table';

const StyledPaper = styled(Paper)(() => ({
  flexGrow: 1,
  minHeight: 0,
  overflow: 'auto',
}));

export function Results() {

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
    <StyledPaper variant="outlined" elevation={0}>
      <Table>
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
      </Table>
    </StyledPaper>
  );
}
