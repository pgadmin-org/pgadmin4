/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, {useContext, useCallback, useEffect, useState} from 'react';
import { makeStyles } from '@material-ui/styles';
import { Box } from '@material-ui/core';
import { PgButtonGroup, PgIconButton } from '../../../../../../static/js/components/Buttons';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import PlaylistAddRoundedIcon from '@material-ui/icons/PlaylistAddRounded';
import FileCopyRoundedIcon from '@material-ui/icons/FileCopyRounded';
import DeleteRoundedIcon from '@material-ui/icons/DeleteRounded';
import TimelineRoundedIcon from '@material-ui/icons/TimelineRounded';
import { PasteIcon, SaveDataIcon } from '../../../../../../static/js/components/ExternalIcon';
import GetAppRoundedIcon from '@material-ui/icons/GetAppRounded';
import {QUERY_TOOL_EVENTS} from '../QueryToolConstants';
import { QueryToolContext, QueryToolEventsContext } from '../QueryToolComponent';
import { PgMenu, PgMenuItem } from '../../../../../../static/js/components/Menu';
import gettext from 'sources/gettext';
import { useKeyboardShortcuts } from '../../../../../../static/js/custom_hooks';
import {shortcut_key} from 'sources/keyboard_shortcuts';
import CopyData from '../QueryToolDataGrid/CopyData';
import PropTypes from 'prop-types';
import CustomPropTypes from '../../../../../../static/js/custom_prop_types';

const useStyles = makeStyles((theme)=>({
  root: {
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: theme.otherVars.editorToolbarBg,
    ...theme.mixins.panelBorder.bottom,
  },
}));

export function ResultSetToolbar({containerRef, canEdit, totalRowCount}) {
  const classes = useStyles();
  const eventBus = useContext(QueryToolEventsContext);
  const queryToolCtx = useContext(QueryToolContext);

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
  ], containerRef);

  return (
    <>
      <Box className={classes.root}>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Add row')} icon={<PlaylistAddRoundedIcon style={{height: 'unset'}}/>}
            accesskey={shortcut_key(queryToolPref.btn_add_row)} disabled={!canEdit} onClick={addRow} />
          <PgIconButton title={gettext('Copy')} icon={<FileCopyRoundedIcon />}
            shortcut={FIXED_PREF.copy} disabled={buttonsDisabled['copy-rows']} onClick={copyData} />
          <PgIconButton title={gettext('Copy options')} icon={<KeyboardArrowDownIcon />} splitButton
            name="menu-copyheader" ref={copyMenuRef} onClick={openMenu} />
          <PgIconButton title={gettext('Paste')} icon={<PasteIcon />}
            accesskey={shortcut_key(queryToolPref.btn_paste_row)} disabled={!canEdit} onClick={pasteRows} />
          <PgIconButton title={gettext('Paste options')} icon={<KeyboardArrowDownIcon />} splitButton
            name="menu-pasteoptions" ref={pasetMenuRef} onClick={openMenu} />
          <PgIconButton title={gettext('Delete')} icon={<DeleteRoundedIcon />}
            accesskey={shortcut_key(queryToolPref.btn_delete_row)} disabled={buttonsDisabled['delete-rows'] || !canEdit} onClick={deleteRows} />
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
      </Box>
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
  containerRef: CustomPropTypes.ref,
  canEdit: PropTypes.bool,
  totalRowCount: PropTypes.number,
};
