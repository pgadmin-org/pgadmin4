/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useCallback, useContext, useEffect, useState } from 'react';

import { styled } from '@mui/material/styles';

import { Box } from '@mui/material';
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import FormatIndentDecreaseIcon from '@mui/icons-material/FormatIndentDecrease';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import NotInterestedIcon from '@mui/icons-material/NotInterested';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import HelpIcon from '@mui/icons-material/HelpRounded';
import RotateLeftRoundedIcon from '@mui/icons-material/RotateLeftRounded';

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';

import { PgButtonGroup, PgIconButton } from '../../../../../static/js/components/Buttons';
import { DebuggerContext, DebuggerEventsContext } from './DebuggerComponent';
import { DEBUGGER_EVENTS, MENUS } from '../DebuggerConstants';
import { useKeyboardShortcuts } from '../../../../../static/js/custom_hooks';



const StyledBox = styled(Box)(({theme}) => ({
  padding: '2px 4px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: theme.otherVars.editorToolbarBg,
  flexWrap: 'wrap',
  ...theme.mixins.panelBorder.bottom,
}));

export function ToolBar() {

  const debuggerCtx = useContext(DebuggerContext);
  const eventBus = useContext(DebuggerEventsContext);
  let preferences = debuggerCtx.preferences.debugger;

  // JS not allowing to use constants as key hence unable to use MENUS constants,
  // If required any changes in key update MENUS constans as well form DebuggerConstans file.
  const [buttonsDisabled, setButtonsDisabled] = useState({
    'stop': true,
    'clear-all-breakpoints': true,
    'toggle-breakpoint': true,
    'start': true,
    'step-over': true,
    'step-into': true,
  });

  const setDisableButton = useCallback((name, disable = true) => {
    setButtonsDisabled((prev) => ({ ...prev, [name]: disable }));
  }, []);

  const clearAllBreakpoint = useCallback(() => {
    eventBus.fireEvent(DEBUGGER_EVENTS.TRIGGER_CLEAR_ALL_BREAKPOINTS);
  }, []);

  const toggleBreakpoint = useCallback(() => {
    eventBus.fireEvent(DEBUGGER_EVENTS.TRIGGER_TOGGLE_BREAKPOINTS);
  }, []);

  const stop = useCallback(() => {
    eventBus.fireEvent(DEBUGGER_EVENTS.TRIGGER_STOP_DEBUGGING);
  });

  const continueDebugger = useCallback(() => {
    eventBus.fireEvent(DEBUGGER_EVENTS.TRIGGER_CONTINUE_DEBUGGING);
  });


  const stepOverDebugger = useCallback(() => {
    eventBus.fireEvent(DEBUGGER_EVENTS.TRIGGER_STEPOVER_DEBUGGING);
  });

  const stepInTODebugger = useCallback(() => {
    eventBus.fireEvent(DEBUGGER_EVENTS.TRIGGER_STEINTO_DEBUGGING);
  });

  const onHelpClick=()=>{
    let url = url_for('help.static', {'filename': 'debugger.html'});
    window.open(url, 'pgadmin_help');
  };

  const onResetLayout=() => {
    eventBus.fireEvent(DEBUGGER_EVENTS.TRIGGER_RESET_LAYOUT);
  };

  useEffect(() => {
    eventBus.registerListener(DEBUGGER_EVENTS.DISABLE_MENU, () => {
      setDisableButton(MENUS.START, true);
      setDisableButton(MENUS.STEPINTO, true);
      setDisableButton(MENUS.STEPOVER, true);
      setDisableButton(MENUS.CLEAR_ALL_BREAKPOINT, true);
      setDisableButton(MENUS.TOGGLE_BREAKPOINT, true);
      setDisableButton(MENUS.STOP, true);
    });

    eventBus.registerListener(DEBUGGER_EVENTS.ENABLE_MENU, () => {
      setDisableButton(MENUS.START, false);
      setDisableButton(MENUS.STEPINTO, false);
      setDisableButton(MENUS.STEPOVER, false);
      setDisableButton(MENUS.CLEAR_ALL_BREAKPOINT, false);
      setDisableButton(MENUS.TOGGLE_BREAKPOINT, false);
      setDisableButton(MENUS.STOP, false);
    });

    eventBus.registerListener(DEBUGGER_EVENTS.ENABLE_SPECIFIC_MENU, (key) => {
      setDisableButton(key, false);
    });
  }, []);


  /* Button shortcuts */
  useKeyboardShortcuts([
    {
      shortcut: preferences.btn_step_into,
      options: {
        callback: ()=>{!buttonsDisabled[MENUS.STEPINTO] && stepInTODebugger();}
      }
    },
    {
      shortcut: preferences.btn_step_over,
      options: {
        callback: ()=>{!buttonsDisabled[MENUS.STEPOVER] && stepOverDebugger();}
      }
    },
    {
      shortcut: preferences.btn_start,
      options: {
        callback: ()=>{!buttonsDisabled[MENUS.START] && continueDebugger();}
      }
    },
    {
      shortcut: preferences.btn_toggle_breakpoint,
      options: {
        callback: ()=>{!buttonsDisabled[MENUS.TOGGLE_BREAKPOINT] && toggleBreakpoint();}
      }
    },
    {
      shortcut: preferences.btn_clear_breakpoints,
      options: {
        callback: ()=>{!buttonsDisabled[MENUS.CLEAR_ALL_BREAKPOINT] && clearAllBreakpoint();}
      }
    },
    {
      shortcut: preferences.btn_stop,
      options: {
        callback: ()=>{!buttonsDisabled[MENUS.STOP] && stop();}
      }
    }
  ], debuggerCtx.containerRef);

  return (
    <StyledBox>
      <PgButtonGroup size="small">
        <PgIconButton data-test='step-in' title={gettext('Step into')} disabled={buttonsDisabled[MENUS.STEPINTO]} icon={<FormatIndentIncreaseIcon />} onClick={() => { stepInTODebugger(); }}
          shortcut={preferences?.btn_step_into} />
        <PgIconButton data-test='step-over' title={gettext('Step over')} disabled={buttonsDisabled[MENUS.STEPOVER]} icon={<FormatIndentDecreaseIcon />} onClick={() => { stepOverDebugger(); }}
          shortcut={preferences?.btn_step_over} />
        <PgIconButton data-test='debugger-contiue' title={gettext('Continue/Start')} disabled={buttonsDisabled[MENUS.START]} icon={<PlayCircleFilledWhiteIcon />} onClick={() => { continueDebugger(); }}
          shortcut={preferences?.btn_start} />
      </PgButtonGroup>
      <PgButtonGroup size="small">
        <PgIconButton data-test='toggle-breakpoint' title={gettext('Toggle breakpoint')} disabled={buttonsDisabled[MENUS.TOGGLE_BREAKPOINT]} icon={<FiberManualRecordIcon style={{height: '2rem'}} />}
          shortcut={preferences?.btn_toggle_breakpoint} onClick={() => { toggleBreakpoint(); }} />
        <PgIconButton data-test='clear-breakpoint' title={gettext('Clear all breakpoints')} disabled={buttonsDisabled[MENUS.CLEAR_ALL_BREAKPOINT]} icon={<NotInterestedIcon />}
          shortcut={preferences?.btn_clear_breakpoints} onClick={() => {
            clearAllBreakpoint();
          }} />
      </PgButtonGroup>
      <PgButtonGroup size="small">
        <PgIconButton data-test='stop-debugger' title={gettext('Stop')} icon={<StopRoundedIcon style={{height: '2rem'}} />} disabled={buttonsDisabled[MENUS.STOP]} onClick={() => { stop(); }}
          shortcut={preferences?.btn_stop} />
      </PgButtonGroup>
      <PgButtonGroup size="small">
        <PgIconButton data-test='debugger-help' title={gettext('Help')} icon={<HelpIcon />} onClick={onHelpClick} />
      </PgButtonGroup>
      <PgButtonGroup size="small" variant="text" style={{marginLeft: 'auto'}}>
        <PgIconButton title={gettext('Reset layout')} icon={<RotateLeftRoundedIcon />}
          onClick={onResetLayout} />
      </PgButtonGroup>
    </StyledBox>
  );
}