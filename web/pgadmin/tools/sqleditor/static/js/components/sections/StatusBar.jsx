
/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useEffect, useState, useContext }  from 'react';
import { styled } from '@mui/material/styles';
import { Box, Tooltip } from '@mui/material';
import _ from 'lodash';
import { QUERY_TOOL_EVENTS } from '../QueryToolConstants';
import { useStopwatch } from '../../../../../../static/js/custom_hooks';
import { QueryToolEventsContext } from '../QueryToolComponent';
import gettext from 'sources/gettext';
import { PgMenu, PgMenuItem, usePgMenuGroup } from '../../../../../../static/js/components/Menu';
import PropTypes from 'prop-types';
import { getEnterKeyHandler } from '../../../../../../static/js/utils';

const StyledBox = styled(Box)(({theme}) => ({
  display: 'flex',
  alignItems: 'center',
  ...theme.mixins.panelBorder.top,
  flexWrap: 'wrap',
  backgroundColor: theme.otherVars.editorToolbarBg,
  userSelect: 'text',
  '& .StatusBar-padding': {
    padding: '2px 12px',
    '&.StatusBar-mlAuto': {
      marginLeft: 'auto',
    },
    '&.StatusBar-divider': {
      ...theme.mixins.panelBorder.right,
    },
  },
}));


export function StatusBar({eol, handleEndOfLineChange}) {
  const eventBus = useContext(QueryToolEventsContext);
  const [position, setPosition] = useState([1, 1]);
  const [lastTaskText, setLastTaskText] = useState(null);
  const [rowsCount, setRowsCount] = useState(0);
  const [selectedRowsCount, setSelectedRowsCount] = useState(0);
  const [dataRowChangeCounts, setDataRowChangeCounts] = useState({
    isDirty: false,
    added: 0,
    updated: 0,
    deleted: 0,
  });
  const {seconds, minutes, hours, msec, start:startTimer, pause:pauseTimer, reset:resetTimer} = useStopwatch({});
  const eolMenuRef = React.useRef(null);
  const {openMenuName, toggleMenu, onMenuClose} = usePgMenuGroup();
  // NONE - no select, PAGE - show select all, ALL - select all.
  const [allRowsSelect, setAllRowsSelect] = useState('NONE');

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
    eventBus.registerListener(QUERY_TOOL_EVENTS.TOTAL_ROWS_COUNT, (total)=>{
      setRowsCount(total);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.ALL_ROWS_SELECTED_STATUS, (v)=>{
      setAllRowsSelect(v);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.SELECTED_ROWS_COLS_CELL_CHANGED, (rows)=>{
      setSelectedRowsCount(rows);
    });
  }, []);

  useEffect(()=>{
    const unregDataChange = eventBus.registerListener(QUERY_TOOL_EVENTS.DATAGRID_CHANGED, (_isDirty, dataChangeStore)=>{
      setDataRowChangeCounts({
        added: Object.keys(dataChangeStore.added||{}).length,
        updated: Object.keys(dataChangeStore.updated||{}).length,
        deleted: dataChangeStore.delete_all ? rowsCount : Object.keys(dataChangeStore.deleted||{}).length,
      });
    });

    return ()=>{
      unregDataChange();
    };
  }, [rowsCount]);

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
      <Box className='StatusBar-padding StatusBar-divider'>{gettext('Total rows: %s', rowsCount)}</Box>
      {lastTaskText &&
        <Box className='StatusBar-padding StatusBar-divider'>{lastTaskText} {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}.{msec.toString().padStart(3, '0')}</Box>
      }
      {!lastTaskText && !_.isNull(lastTaskText) &&
        <Box className='StatusBar-padding StatusBar-divider'>{lastTaskText} {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}.{msec.toString().padStart(3, '0')}</Box>
      }
      {Boolean(selectedRowsCount) &&
        <Box className='StatusBar-padding StatusBar-divider'>{gettext('Rows selected: %s', allRowsSelect == 'ALL' ? rowsCount : selectedRowsCount)}</Box>}
      {stagedText &&
        <Box className='StatusBar-padding StatusBar-divider'>
          <span>{gettext('Changes staged: %s', stagedText)}</span>
        </Box>
      }

      <Box className='StatusBar-padding StatusBar-mlAuto' style={{display:'flex'}}>
        <Box className="StatusBar-padding StatusBar-divider">
          <Tooltip title="Select EOL Sequence" enterDelay={2500}>
            <span
              onClick={toggleMenu}
              onKeyDown={getEnterKeyHandler(toggleMenu)}
              ref={eolMenuRef}
              name="menu-eoloptions"
              style={{
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 'inherit',
              }}
            >
              {eol.toUpperCase()}
            </span>
          </Tooltip>
          <PgMenu
            anchorRef={eolMenuRef}
            open={openMenuName=='menu-eoloptions'}
            onClose={onMenuClose}
            label={gettext('EOL Options Menu')}
          >
            <PgMenuItem hasCheck value="lf" checked={eol === 'lf'} onClick={handleEndOfLineChange}>{gettext('LF')}</PgMenuItem>
            <PgMenuItem hasCheck value="crlf" checked={eol === 'crlf'} onClick={handleEndOfLineChange}>{gettext('CRLF')}</PgMenuItem>
          </PgMenu>
        </Box>
        <Box className='StatusBar-padding'>{gettext('Ln %s, Col %s', position[0], position[1])}</Box>
      </Box>
    </StyledBox>
  );
}

StatusBar.propTypes = {
  eol: PropTypes.string,
  handleEndOfLineChange: PropTypes.func,
};
