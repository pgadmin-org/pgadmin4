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
import gettext from 'sources/gettext';

import React, { useState } from 'react';

import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';

import { DebuggerEventsContext } from './DebuggerComponent';
import { DEBUGGER_EVENTS } from '../DebuggerConstants';
import { InputText } from '../../../../../static/js/components/FormComponents';
import Table from '../../../../../static/js/components/Table';

const StyledPaper = styled(Paper)(() => ({
  flexGrow: 1,
  minHeight: 0,
  overflow: 'auto',
  maxHeight: '100%',
  '& .Stack-container': {
    maxHeight: '100%'
  }
}));

export function Stack() {

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
    <StyledPaper variant="outlined" elevation={0}>
      <TableContainer className='Stack-container'>
        <Table aria-label="sticky table">
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
        </Table>
      </TableContainer>
    </StyledPaper>
  );
}
