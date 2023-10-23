/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { makeStyles } from '@material-ui/styles';
import PropTypes from 'prop-types';

import React, { useContext, useEffect } from 'react';

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';

import getApiInstance from '../../../../../static/js/api_instance';
import CodeMirror from '../../../../../static/js/components/CodeMirror';
import { DEBUGGER_EVENTS } from '../DebuggerConstants';
import { DebuggerEventsContext } from './DebuggerComponent';
import { usePgAdmin } from '../../../../../static/js/BrowserComponent';


const useStyles = makeStyles(() => ({
  sql: {
    height: '100%',
  }
}));

export default function DebuggerEditor({ getEditor, params }) {
  const classes = useStyles();
  const editor = React.useRef();
  const eventBus = useContext(DebuggerEventsContext);
  const pgAdmin = usePgAdmin();

  const api = getApiInstance();

  function makeMarker() {
    let marker = document.createElement('div');
    marker.style.color = '#822';
    marker.innerHTML = '●';
    return marker;
  }

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

  function onBreakPoint(cm, n, gutter) {
    // If breakpoint gutter is clicked and execution is not completed then only set the breakpoint
    if (gutter == 'breakpoints' && !params.debuggerDirect.polling_timeout_idle) {
      let info = cm.lineInfo(n);
      // If gutterMarker is undefined that means there is no marker defined previously
      // So we need to set the breakpoint command here...
      if (info.gutterMarkers == undefined) {
        setBreakpoint(n + 1, 1); //set the breakpoint
      } else {
        if (info.gutterMarkers.breakpoints == undefined) {
          setBreakpoint(n + 1, 1); //set the breakpoint
        } else {
          setBreakpoint(n + 1, 0); //clear the breakpoint
        }
      }

      // If line folding is defined then gutterMarker will be defined so
      // we need to find out 'breakpoints' information
      let markers = info.gutterMarkers;
      if (markers != undefined && info.gutterMarkers.breakpoints == undefined)
        markers = info.gutterMarkers.breakpoints;
      cm.setGutterMarker(n, 'breakpoints', markers ? null : makeMarker());
    }
  }

  eventBus.registerListener(DEBUGGER_EVENTS.EDITOR_SET_SQL, (value, focus = true) => {
    focus && editor.current?.focus();
    editor.current?.setValue(value);
  });

  useEffect(() => {
    self = this;
    // Register the callback when user set/clear the breakpoint on gutter area.
    editor.current.on('gutterClick', onBreakPoint);
    getEditor(editor.current);
  }, [editor.current]);
  return (
    <CodeMirror
      currEditor={(obj) => {
        editor.current = obj;
      }}
      gutters={['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'breakpoints']}
      value={''}
      className={classes.sql}
      disabled={true}
    />);
}

DebuggerEditor.propTypes = {
  getEditor: PropTypes.func,
  params: PropTypes.object
};
