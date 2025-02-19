/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';

import React, { useContext, useEffect, useMemo } from 'react';

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';

import getApiInstance from '../../../../../static/js/api_instance';
import CodeMirror from '../../../../../static/js/components/ReactCodeMirror';
import { DEBUGGER_EVENTS } from '../DebuggerConstants';
import { DebuggerContext, DebuggerEventsContext } from './DebuggerComponent';
import { usePgAdmin } from '../../../../../static/js/PgAdminProvider';
import { isShortcutValue, parseKeyEventValue, parseShortcutValue } from '../../../../../static/js/utils';


const StyledCodeMirror = styled(CodeMirror)(()=>({
  '&.Query-sql': {
    height: '100%',
  }
}));

export default function DebuggerEditor({ getEditor, params }) {
  const editor = React.useRef();
  const eventBus = useContext(DebuggerEventsContext);
  const pgAdmin = usePgAdmin();
  const debuggerCtx = useContext(DebuggerContext);
  let preferences = debuggerCtx.preferences.debugger;

  const api = getApiInstance();

  function setBreakpoint(lineNo, setType) {
    // Make ajax call to set/clear the break point by user
    let baseUrl = url_for('debugger.set_breakpoint', {
      'trans_id': params.transId,
      'line_no': lineNo,
      'set_type': setType,
    });
    api({
      url: baseUrl,
      method: 'GET',
    })
      .then(function(res) {
        if (res.data.data.status) {
        // Breakpoint has been set by the user
        }
      })
      .catch(function() {
        pgAdmin.Browser.notifier.alert(
          gettext('Debugger Error'),
          gettext('Error while setting debugging breakpoint.')
        );
      });
  }

  eventBus.registerListener(DEBUGGER_EVENTS.EDITOR_SET_SQL, (value, focus = true) => {
    focus && editor.current?.focus();
    editor.current?.setValue(value);
  });

  useEffect(() => {
    self = this;
    getEditor(editor.current);
  }, [editor.current]);

  const shortcutOverrideKeys = useMemo(
    ()=>{
      // omit CM internal shortcuts
      const debuggerShortcuts = Object.values(preferences)
        .filter((p)=>isShortcutValue(p))
        .map((p)=>parseShortcutValue(p));

      return [{
        any: (_v, e)=>{
          const eventStr = parseKeyEventValue(e);
          if(debuggerShortcuts.includes(eventStr)) {
            debuggerCtx.containerRef?.current?.dispatchEvent(new KeyboardEvent('keydown', {
              which: e.which,
              keyCode: e.keyCode,
              altKey: e.altKey,
              shiftKey: e.shiftKey,
              ctrlKey: e.ctrlKey,
              metaKey: e.metaKey,
            }));
            e.preventDefault();
            e.stopPropagation();
            return true;
          }
          return false;
        },
      }];
    },
    [preferences]
  );

  return (
    <StyledCodeMirror
      currEditor={(obj) => {
        editor.current = obj;
      }}
      value={''}
      onBreakPointChange={(line, on)=>{
        setBreakpoint(line, on ? 1 : 0);
      }}
      className='Query-sql'
      readonly={true}
      customKeyMap={shortcutOverrideKeys}
      breakpoint
    />);
}

DebuggerEditor.propTypes = {
  getEditor: PropTypes.func,
  params: PropTypes.object
};
