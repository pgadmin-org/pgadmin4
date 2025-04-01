/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, {useContext, useCallback, useEffect, useState} from 'react';
import { styled } from '@mui/material/styles';
import { Box, Portal } from '@mui/material';
import { DefaultButton, PgButtonGroup, PgIconButton } from '../../../../../../static/js/components/Buttons';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import FileCopyRoundedIcon from '@mui/icons-material/FileCopyRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import { PasteIcon, SQLQueryIcon, SaveDataIcon } from '../../../../../../static/js/components/ExternalIcon';
import GetAppRoundedIcon from '@mui/icons-material/GetAppRounded';
import FastForwardRoundedIcon from '@mui/icons-material/FastForwardRounded';
import FastRewindRoundedIcon from '@mui/icons-material/FastRewindRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import SkipPreviousRoundedIcon from '@mui/icons-material/SkipPreviousRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import EditOffRoundedIcon from '@mui/icons-material/EditOffRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

import {QUERY_TOOL_EVENTS} from '../QueryToolConstants';
import { QueryToolContext, QueryToolEventsContext } from '../QueryToolComponent';
import { PgMenu, PgMenuItem } from '../../../../../../static/js/components/Menu';
import gettext from 'sources/gettext';
import { useKeyboardShortcuts } from '../../../../../../static/js/custom_hooks';
import CopyData from '../QueryToolDataGrid/CopyData';
import PropTypes from 'prop-types';
import CodeMirror from '../../../../../../static/js/components/ReactCodeMirror';
import { setEditorPosition } from '../QueryToolDataGrid/Editors';
import { InputText } from '../../../../../../static/js/components/FormComponents';
import { isEmptyString, minMaxValidator } from '../../../../../../static/js/validators';

const StyledDiv = styled('div')(({theme})=>({
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  rowGap: '4px',
  backgroundColor: theme.otherVars.editorToolbarBg,
  justifyContent: 'space-between',
  ...theme.mixins.panelBorder.bottom,

  '& .PaginationInputs': {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',

    '& .PaginationInputs-divider': {
      ...theme.mixins.panelBorder.right,
    }
  }
}));

const StyledEditor = styled('div')(({theme})=>({
  position: 'absolute',
  backgroundColor: theme.palette.background.default,
  fontSize: '12px',
  ...theme.mixins.panelBorder.all,
  maxWidth:'50%',
  overflow:'auto',
  maxHeight:'35%',
  '& .textarea': {
    border: 0,
    outline: 0,
    resize: 'both',
  }
}));

function ShowDataOutputQueryPopup({query}) {
  function suppressEnterKey(e) {
    if(e.keyCode == 13) {
      e.stopPropagation();
    }
  }

  return (
    <Portal container={document.body}>
      <StyledEditor ref={(ele)=>{
        setEditorPosition(document.getElementById('sql-query'), ele, '.MuiBox-root', 29);
      }} onKeyDown={suppressEnterKey}>
        <CodeMirror
          value={query || ''}
          className={'textarea'}
          readonly={true}
        />
      </StyledEditor>
    </Portal>
  );
}
ShowDataOutputQueryPopup.propTypes = {
  query: PropTypes.string,
};


function PaginationInputs({pagination, totalRowCount, clearSelection}) {
  const eventBus = useContext(QueryToolEventsContext);
  const [editPageRange, setEditPageRange] = useState(false);
  const [errorInputs, setErrorInputs] = useState({
    'from': false,
    'to': false,
    'pageNo': false
  });
  const [inputs, setInputs] = useState({
    from: pagination.rows_from ?? 0,
    to: pagination.rows_to ?? 0,
    pageNo: pagination.page_no ?? 0,
    pageCount: pagination.page_count ?? 0,
  });

  const goToPage = (pageNo)=>{
    const from = (pageNo-1) * pagination.page_size + 1;
    const to = from + pagination.page_size - 1;
    eventBus.fireEvent(QUERY_TOOL_EVENTS.FETCH_WINDOW, from, to);
    clearSelection();
  };

  const onInputChange = (key, value)=>{
    setInputs((prev)=>({...prev, [key]: value}));
  };

  const onInputKeydown = (e)=>{
    if(e.code === 'Enter' && !errorInputs.from && !errorInputs.to) {
      e.preventDefault();
      eventBus.fireEvent(QUERY_TOOL_EVENTS.FETCH_WINDOW, inputs.from, inputs.to);
    }
  };

  const onInputKeydownPageNo = (e)=>{
    if(e.code === 'Enter' && !errorInputs.pageNo) {
      e.preventDefault();
      goToPage(inputs.pageNo);
    }
  };

  useEffect(()=>{
    setInputs({
      from: pagination.rows_from ?? 0,
      to: pagination.rows_to ?? 0,
      pageNo: pagination.page_no ?? 0,
      pageCount: pagination.page_count ?? 0,
    });
  }, [pagination, editPageRange]);

  useEffect(()=>{
    // validate
    setErrorInputs((prev)=>{
      let errors = {...prev};

      if(minMaxValidator('', parseInt(inputs.pageNo), 1, parseInt(inputs.pageCount)) || isEmptyString(inputs.pageNo)) {
        errors.pageNo = true;
      } else {
        errors.pageNo = false;
      }
      if(minMaxValidator('', parseInt(inputs.from), 1, parseInt(inputs.to)) || isEmptyString(inputs.from)) {
        errors.from = true;
      } else {
        errors.from = false;
      }
      if(minMaxValidator('', parseInt(inputs.to), 1, totalRowCount) || isEmptyString(inputs.to)) {
        errors.to = true;
      } else {
        errors.to = false;
      }

      return errors;
    });
  }, [inputs]);

  return (
    <Box className='PaginationInputs'>
      {editPageRange ?
        <Box display="flex" gap="2px" alignItems="center">
          <div>{gettext('Showing rows:')}</div>
          <InputText
            type="int"
            size="small"
            controlProps={{maxLength: 7}}
            style={{
              maxWidth: '10ch'
            }}
            value={inputs.from}
            onChange={(value)=>onInputChange('from', value)}
            onKeyDown={onInputKeydown}
            error={errorInputs['from']}
          />
          <div>{gettext('to')}</div>
          <InputText
            type="int"
            size="small"
            controlProps={{maxLength: 7}}
            style={{
              maxWidth: '10ch'
            }}
            value={inputs.to}
            onChange={(value)=>onInputChange('to', value)}
            onKeyDown={onInputKeydown}
            error={errorInputs['to']}
          />
        </Box> : <span>{gettext('Showing rows: %s to %s', inputs.from, inputs.to)}</span>}
      <PgButtonGroup>
        {editPageRange && <PgIconButton size="xs"
          title={editPageRange ? gettext('Apply (or press Enter on input)') : gettext('Edit range')}
          onClick={()=>eventBus.fireEvent(QUERY_TOOL_EVENTS.FETCH_WINDOW, inputs.from, inputs.to)}
          disabled={errorInputs.from || errorInputs.to} icon={<CheckRoundedIcon />}
        />}
        <PgIconButton size="xs"
          title={editPageRange ? gettext('Cancel edit') : gettext('Edit range')}
          onClick={()=>setEditPageRange((prev)=>!prev)}
          icon={editPageRange ? <EditOffRoundedIcon /> : <EditRoundedIcon />}
        />
      </PgButtonGroup>
      <div className='PaginationInputs-divider'>&nbsp;</div>
      <span>{gettext('Page No:')}</span>
      <InputText
        type="int"
        size="small"
        controlProps={{maxLength: 7}}
        style={{
          maxWidth: '10ch'
        }}
        value={inputs.pageNo}
        onChange={(value)=>onInputChange('pageNo', value)}
        onKeyDown={onInputKeydownPageNo}
        error={errorInputs['pageNo']}
      />
      <span> {gettext('of')} {pagination.page_count}</span>
      <div className='PaginationInputs-divider'>&nbsp;</div>
      <PgButtonGroup size="small">
        <PgIconButton title={gettext('First Page')} disabled={pagination.page_no <= 1} onClick={()=>goToPage(1)} icon={<SkipPreviousRoundedIcon />}/>
        <PgIconButton title={gettext('Previous Page')} disabled={pagination.page_no <= 1} onClick={()=>goToPage(pagination.page_no-1)} icon={<FastRewindRoundedIcon />}/>
        <PgIconButton title={gettext('Next Page')} disabled={pagination.page_no == pagination.page_count} onClick={()=>goToPage(pagination.page_no+1)} icon={<FastForwardRoundedIcon />}/>
        <PgIconButton title={gettext('Last Page')} disabled={pagination.page_no == pagination.page_count} onClick={()=>goToPage(pagination.page_count)} icon={<SkipNextRoundedIcon />} />
      </PgButtonGroup>
    </Box>
  );
}
PaginationInputs.propTypes = {
  pagination: PropTypes.object,
  totalRowCount: PropTypes.number,
  clearSelection: PropTypes.func,
};
export function ResultSetToolbar({query, canEdit, totalRowCount, pagination, allRowsSelect}) {
  const eventBus = useContext(QueryToolEventsContext);
  const queryToolCtx = useContext(QueryToolContext);
  const [dataOutputQueryBtn,setDataOutputQueryBtn] = useState(false);
  const [buttonsDisabled, setButtonsDisabled] = useState({
    'save-data': true,
    'delete-rows': true,
    'copy-rows': true,
    'save-result': true,
  });
  const [menuOpenId, setMenuOpenId] = React.useState(null);
  const [checkedMenuItems, setCheckedMenuItems] = React.useState({});
  /* Menu button refs */
  const copyMenuRef = React.useRef(null);
  const pasetMenuRef = React.useRef(null);

  const queryToolPref = queryToolCtx.preferences.sqleditor;

  const setDisableButton = useCallback((name, disable=true)=>{
    setButtonsDisabled((prev)=>({...prev, [name]: disable}));
  }, []);
  const saveData = useCallback(()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_SAVE_DATA);
  }, []);
  const deleteRows = useCallback(()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_DELETE_ROWS);
  }, []);
  const pasteRows = useCallback(async ()=>{
    let copyUtils = new CopyData({
      quoting: queryToolPref.results_grid_quoting,
      quote_char: queryToolPref.results_grid_quote_char,
      field_separator: queryToolPref.results_grid_field_separator,
    });
    let copiedRows = copyUtils.getCopiedRows();
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_ADD_ROWS, copiedRows, true, checkedMenuItems['paste_with_serials']);
  }, [queryToolPref, checkedMenuItems['paste_with_serials']]);
  const copyData = ()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.COPY_DATA, checkedMenuItems['copy_with_headers']);
  };
  const addRow = useCallback(()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_ADD_ROWS, [[]]);
  }, []);
  const downloadResult = useCallback(()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_SAVE_RESULTS);
  }, []);
  const showGraphVisualiser = useCallback(()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_GRAPH_VISUALISER);
  }, []);

  const openMenu = useCallback((e)=>{
    setMenuOpenId(e.currentTarget.name);
  }, []);
  const handleMenuClose = useCallback(()=>{
    setMenuOpenId(null);
  }, []);

  const checkMenuClick = useCallback((e)=>{
    setCheckedMenuItems((prev)=>{
      let newVal = !prev[e.value];
      return {
        ...prev,
        [e.value]: newVal,
      };
    });
  }, []);


  useEffect(()=>{
    eventBus.registerListener(QUERY_TOOL_EVENTS.DATAGRID_CHANGED, (isDirty)=>{
      setDisableButton('save-data', !isDirty);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.SELECTED_ROWS_COLS_CELL_CHANGED, (rows, cols, range, cell)=>{
      setDisableButton('delete-rows', !rows);
      setDisableButton('copy-rows', (!rows && !cols && !cell && !range));
    });
  }, []);

  useEffect(()=>{
    setDisableButton('save-result', (totalRowCount||0) < 1);
  }, [totalRowCount]);

  useEffect(()=>{
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_COPY_DATA, copyData);
    return ()=>eventBus.deregisterListener(QUERY_TOOL_EVENTS.TRIGGER_COPY_DATA, copyData);
  }, [checkedMenuItems['copy_with_headers']]);

  const FIXED_PREF = {
    copy: {
      'control': true,
      ctrl_is_meta: true,
      'shift': false,
      'alt': false,
      'key': {
        'key_code': 67,
        'char': 'C',
      },
    },
  };

  useKeyboardShortcuts([
    {
      shortcut: queryToolPref.btn_add_row,
      options: {
        callback: ()=>{canEdit && addRow();}
      }
    },
    {
      shortcut: queryToolPref.btn_paste_row,
      options: {
        callback: ()=>{canEdit && pasteRows();}
      }
    },
    {
      shortcut: queryToolPref.btn_delete_row,
      options: {
        callback: ()=>{!(buttonsDisabled['delete-rows'] || !canEdit) && deleteRows();}
      }
    },
    {
      shortcut: queryToolPref.save_data,
      options: {
        callback: ()=>{saveData();}
      }
    },
    {
      shortcut: queryToolPref.download_results,
      options: {
        callback: (e)=>{e.preventDefault(); downloadResult();}
      }
    },
  ], queryToolCtx.mainContainerRef);

  const clearSelection = ()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.CLEAR_ROWS_SELECTED);
  };

  return (
    <>
      <StyledDiv>
        <Box display="flex" alignItems="center" gap="4px">
          <PgButtonGroup size="small">
            <PgIconButton title={gettext('Add row')} icon={<PlaylistAddRoundedIcon style={{height: 'unset'}}/>}
              shortcut={queryToolPref.btn_add_row} disabled={!canEdit} onClick={addRow} />
            <PgIconButton title={gettext('Copy')} icon={<FileCopyRoundedIcon />}
              shortcut={FIXED_PREF.copy} disabled={buttonsDisabled['copy-rows']||allRowsSelect=='ALL'} onClick={copyData} />
            <PgIconButton title={gettext('Copy options')} icon={<KeyboardArrowDownIcon />} splitButton
              name="menu-copyheader" ref={copyMenuRef} onClick={openMenu} />
            <PgIconButton title={gettext('Paste')} icon={<PasteIcon />}
              shortcut={queryToolPref.btn_paste_row} disabled={!canEdit} onClick={pasteRows} />
            <PgIconButton title={gettext('Paste options')} icon={<KeyboardArrowDownIcon />} splitButton
              name="menu-pasteoptions" ref={pasetMenuRef} onClick={openMenu} />
            <PgIconButton title={gettext('Delete')} icon={<DeleteRoundedIcon />}
              shortcut={queryToolPref.btn_delete_row} disabled={buttonsDisabled['delete-rows'] || !canEdit} onClick={deleteRows} />
          </PgButtonGroup>
          <PgButtonGroup size="small">
            <PgIconButton title={gettext('Save Data Changes')} icon={<SaveDataIcon />}
              shortcut={queryToolPref.save_data} disabled={buttonsDisabled['save-data'] || !canEdit} onClick={saveData}/>
          </PgButtonGroup>
          <PgButtonGroup size="small">
            <PgIconButton title={gettext('Save results to file')} icon={<GetAppRoundedIcon />}
              onClick={downloadResult} shortcut={queryToolPref.download_results}
              disabled={buttonsDisabled['save-result']} />
          </PgButtonGroup>
          <PgButtonGroup size="small">
            <PgIconButton title={gettext('Graph Visualiser')} icon={<TimelineRoundedIcon />}
              onClick={showGraphVisualiser} disabled={buttonsDisabled['save-result']} />
          </PgButtonGroup>
          {query &&
          <>
            <PgButtonGroup size="small">
              <PgIconButton title={gettext('SQL query of data')} icon={<SQLQueryIcon />}
                onClick={()=>{setDataOutputQueryBtn(prev=>!prev);}} onBlur={()=>{setDataOutputQueryBtn(false);}} disabled={!query} id='sql-query'/>
            </PgButtonGroup>
            { dataOutputQueryBtn && <ShowDataOutputQueryPopup query={query} />}
          </>
          }
          {
            allRowsSelect == 'PAGE' && totalRowCount > pagination.page_size && (
              <div>
                <span>{gettext('All rows on this page are selected.')}</span>
                <PgButtonGroup size="small">
                  <DefaultButton onClick={()=>eventBus.fireEvent(QUERY_TOOL_EVENTS.ALL_ROWS_SELECTED)}>Select All {totalRowCount} Rows</DefaultButton>
                </PgButtonGroup>
              </div>
            )
          }
          {
            allRowsSelect == 'ALL' && (
              <div>
                <span>{gettext('All %s rows are selected.', totalRowCount)}</span>
                <PgButtonGroup size="small">
                  <DefaultButton onClick={clearSelection}>{gettext('Clear Selection')}</DefaultButton>
                </PgButtonGroup>
              </div>
            )
          }
        </Box>
        {totalRowCount > 0 &&
        <Box>
          <PaginationInputs key={JSON.stringify(pagination)} pagination={pagination} totalRowCount={totalRowCount} clearSelection={clearSelection} />
        </Box>}
      </StyledDiv>
      <PgMenu
        anchorRef={copyMenuRef}
        open={menuOpenId=='menu-copyheader'}
        onClose={handleMenuClose}
        label={gettext('Copy Options Menu')}
      >
        <PgMenuItem hasCheck value="copy_with_headers" checked={checkedMenuItems['copy_with_headers']} onClick={checkMenuClick}>{gettext('Copy with headers')}</PgMenuItem>
      </PgMenu>
      <PgMenu
        anchorRef={pasetMenuRef}
        open={menuOpenId=='menu-pasteoptions'}
        onClose={handleMenuClose}
        label={gettext('Paste Options Menu')}
      >
        <PgMenuItem hasCheck value="paste_with_serials" checked={checkedMenuItems['paste_with_serials']} onClick={checkMenuClick}>{gettext('Paste with SERIAL/IDENTITY values?')}</PgMenuItem>
      </PgMenu>
    </>
  );
}

ResultSetToolbar.propTypes = {
  query: PropTypes.string,
  canEdit: PropTypes.bool,
  totalRowCount: PropTypes.number,
  allRowsSelect: PropTypes.string,
  pagination: PropTypes.object,
};
