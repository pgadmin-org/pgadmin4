
/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useEffect, useState, useContext }  from 'react';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import _ from 'lodash';
import { QUERY_TOOL_EVENTS } from '../QueryToolConstants';
import { useStopwatch } from '../../../../../../static/js/custom_hooks';
import { QueryToolEventsContext } from '../QueryToolComponent';
import gettext from 'sources/gettext';


const StyledBox = styled(Box)(({theme}) => ({
  display: 'flex',
  alignItems: 'center',
  ...theme.mixins.panelBorder.top,
  flexWrap: 'wrap',
  backgroundColor: theme.otherVars.editorToolbarBg,
  userSelect: 'text',
  '& .StatusBar-padding': {
    padding: '2px 12px',
    '& .StatusBar-mlAuto': {
      marginLeft: 'auto',
    },
    '& .StatusBar-divider': {
      ...theme.mixins.panelBorder.right,
    },
  },
}));

export function StatusBar() {

  const eventBus = useContext(QueryToolEventsContext);
  const [position, setPosition] = useState([1, 1]);
  const [lastTaskText, setLastTaskText] = useState(null);
  const [rowsCount, setRowsCount] = useState([0, 0]);
  const [selectedRowsCount, setSelectedRowsCount] = useState(0);
  const [dataRowChangeCounts, setDataRowChangeCounts] = useState({
    isDirty: false,
    added: 0,
    updated: 0,
    deleted: 0,
  });
  const {seconds, minutes, hours, msec, start:startTimer, pause:pauseTimer, reset:resetTimer} = useStopwatch({});

  useEffect(()=>{
    eventBus.registerListener(QUERY_TOOL_EVENTS.CURSOR_ACTIVITY, (newPos)=>{
      setPosition(newPos||[1, 1]);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.EXECUTION_END, ()=>{
      pauseTimer();
      setLastTaskText(gettext('Query complete'));
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.TASK_START, (taskText, startTime)=>{
      resetTimer();
      startTimer(startTime);
      setLastTaskText(taskText);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.TASK_END, (taskText, endTime)=>{
      pauseTimer(endTime);
      setLastTaskText(taskText);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.ROWS_FETCHED, (fetched, total)=>{
      setRowsCount([fetched||0, total||0]);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.SELECTED_ROWS_COLS_CELL_CHANGED, (rows)=>{
      setSelectedRowsCount(rows);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.DATAGRID_CHANGED, (_isDirty, dataChangeStore)=>{
      setDataRowChangeCounts({
        added: Object.keys(dataChangeStore.added||{}).length,
        updated: Object.keys(dataChangeStore.updated||{}).length,
        deleted: Object.keys(dataChangeStore.deleted||{}).length,
      });
    });
  }, []);

  let stagedText = '';
  if(dataRowChangeCounts.added > 0) {
    stagedText += ' ' + gettext('Added: %s', dataRowChangeCounts.added);
  }
  if(dataRowChangeCounts.updated > 0) {
    stagedText +=  ' ' + gettext('Updated: %s', dataRowChangeCounts.updated);
  }
  if(dataRowChangeCounts.deleted > 0) {
    stagedText +=  ' ' + gettext('Deleted: %s', dataRowChangeCounts.deleted);
  }

  return (
    <StyledBox>
      <Box className='StatusBar-padding StatusBar-divider'>{gettext('Total rows: %s of %s', rowsCount[0], rowsCount[1])}</Box>
      {lastTaskText &&
        <Box className='StatusBar-padding StatusBar-divider'>{lastTaskText} {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}.{msec.toString().padStart(3, '0')}</Box>
      }
      {!lastTaskText && !_.isNull(lastTaskText) &&
        <Box className='StatusBar-padding StatusBar-divider'>{lastTaskText} {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}.{msec.toString().padStart(3, '0')}</Box>
      }
      {Boolean(selectedRowsCount) &&
        <Box className='StatusBar-padding StatusBar-divider'>{gettext('Rows selected: %s',selectedRowsCount)}</Box>}
      {stagedText &&
        <Box className='StatusBar-padding StatusBar-divider'>
          <span>{gettext('Changes staged: %s', stagedText)}</span>
        </Box>
      }
      <Box className='StatusBar-padding StatusBar-mlAuto'>{gettext('Ln %s, Col %s', position[0], position[1])}</Box>
    </StyledBox>
  );
}
