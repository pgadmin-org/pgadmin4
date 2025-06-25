/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect } from 'react';
import { Box, styled, useTheme } from '@mui/material';
import url_for from 'sources/url_for';
import PropTypes from 'prop-types';

import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { io } from 'socketio';
import { copyToClipboard } from '../../../../../static/js/clipboard';
import 'pgadmin.browser.keyboard';
import gettext from 'sources/gettext';
import { useApplicationState } from '../../../../../settings/static/ApplicationStateProvider';
import { LAYOUT_EVENTS } from '../../../../../static/js/helpers/Layout';

const Root = styled(Box)(()=>({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  flexGrow: '1',
  tabIndex: '0',
}));

function psql_socket_io(socket, is_enable, sid, db, server_type, fitAddon, term, role){
  // Listen all the socket events emit from server.
  let init_psql = true;
  socket.on('pty-output', function(data){
    if(data.error) {
      term.write('\r\n');
    }
    term.write(data.result);
    if(data.error) {
      term.write('\r\n');
    }
    if (init_psql && data && role) {
      // setting role if available
      socket.emit('socket_set_role',{'role': _.unescape(role)});
      init_psql = false;
    }
  });
  // Connect socket
  socket.on('connect', () => {
    if(is_enable){
      socket.emit('start_process', {'sid': sid, 'db': db, 'stype': server_type });
    }
    fitAddon.fit();
    socket.emit('resize', {'cols': term.cols, 'rows': term.rows});
  });

  socket.on('conn_error', (response) => {
    term.write(response.error);
    fitAddon.fit();
    socket.emit('resize', {'cols': term.cols, 'rows': term.rows});
  });

  socket.on('conn_not_allow', () => {
    term.write('PSQL connection not allowed');
    fitAddon.fit();
    socket.emit('resize', {'cols': term.cols, 'rows': term.rows});
  });

  socket.on('disconnect-psql', () => {
    socket.emit('server-disconnect', {'sid': sid});
    term.write('\r\nServer disconnected, Connection terminated, To create new connection please open another psql tool.');
  });
}

function psql_terminal_io(term, socket, platform, pgAdmin) {
  // Listen key press event from terminal and emit socket event.
  term.attachCustomKeyEventHandler(e => {
    e.stopPropagation();
    if(e.type=='keydown' && (e.metaKey || e.ctrlKey) && (e.key == 'c' || e.key == 'C')) {
      let selected_text = term.getSelection();
      navigator.permissions.query({ name: 'clipboard-write' }).then(function(result) {
        if(result.state === 'granted' || result.state === 'prompt') {
          copyToClipboard(selected_text);
        } else {
          pgAdmin.Browser.notifier.alert(gettext('Clipboard write permission required'), gettext('To copy data from PSQL terminal, Clipboard write permission required.'));
        }
      });
    } else {
      self.pgAdmin.Browser.keyboardNavigation.triggerIframeEventsBroadcast(e,true);
    }

    return !(e.ctrlKey && platform == 'win32');
  });

  term.textarea.addEventListener('paste', function() {
    navigator.permissions.query({ name: 'clipboard-read' }).then(function(result) {
      if(result.state === 'granted' || result.state === 'prompt') {
        navigator.clipboard.readText().then( clipText => {
          let selected_text = clipText;
          if (selected_text.length > 0) {
            socket.emit('socket_input', {'input': selected_text, 'key_name': 'paste'});
          }
        });
      } else{
        pgAdmin.Browser.notifier.alert(gettext('Clipboard read permission required'), gettext('To paste data on the PSQL terminal, Clipboard read permission required.'));
      }
    });
  });

  term.onKey(function (ev) {
    let key = ev.key;
    /*
      Using the Option/Alt key to type special characters (such as '\', '[', etc.) often does not register
      the correct character in ev.key when using xterm.js. This is due to limitations in how browsers and
      xterm.js handle modifier keys across platforms.
      To address this, if the Alt/Option key is pressed and the key is a single character,
      we use ev.domEvent.key, which more reliably represents the actual character intended by the user.
    */
    if (ev.domEvent.altKey && ev.domEvent.key.length === 1){
      key = ev.domEvent.key;
    }
    socket.emit('socket_input', {'input': key, 'key_name': ev.domEvent.code});
  });
}

function psql_Addon(term) {
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new WebLinksAddon());
  term.loadAddon(new SearchAddon());
  return fitAddon;
}

function psql_socket() {
  return io('/pty', {
    path: `${url_for('pgadmin.root')}/socket.io`,
    pingTimeout: 120000,
    pingInterval: 25000
  });
}

export default function  PsqlComponent({ params, pgAdmin, panelId, panelDocker }) {
  const theme = useTheme();
  const termRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const {saveToolData, isSaveToolDataEnabled} = useApplicationState();

  const setTheme = ()=>{
    if(termRef.current) {
      termRef.current.options.theme = {
        background: theme.palette.background.default,
        foreground: theme.palette.text.primary,
        cursor: theme.palette.text.primary,
        cursorAccent: theme.palette.text.primary,
        selectionBackground: `${theme.otherVars.editor.selectionBg}`,
      };
    }
  };

  useEffect(()=>{
    // Initialize terminal
    const term = new Terminal({
      cursorBlink: true,
      scrollback: 5000,
    });
    termRef.current = term;
    setTheme();

    /* Addon for fitAddon, webLinkAddon, SearchAddon */
    const fitAddon = psql_Addon(term);

    /*  Open terminal */
    term.open(containerRef.current);

    /*  Socket */
    const socket = psql_socket();
    psql_socket_io(socket, params.is_enable, params.sid, params.db, params.server_type, fitAddon, term, params.role);
    psql_terminal_io(term, socket, params.platform, pgAdmin);

    const setTerminalSize = ()=>{
      // Set terminal size
      fitAddon.fit();
      setTimeout(function(){
        socket.emit('resize', {'cols': term.cols, 'rows': term.rows});
      }, 1000);

      // Focus on terminal
      termRef.current.focus();
    };

    setTerminalSize();

    // Save tool data if enabled
    if(isSaveToolDataEnabled('psql')){
      saveToolData('psql', params,  params.trans_id, null);
    }

    const deregFocus = panelDocker.eventBus.registerListener(LAYOUT_EVENTS.ACTIVE, _.debounce((currentTabId)=>{
      if(panelId == currentTabId) {
        setTerminalSize();
      }
    }, 100));

    return () => {
      deregFocus();
      term.dispose();
      socket.disconnect();
    };
  }, []);

  useEffect(()=>{
    setTheme();
  },[theme]);

  return (
    <Root ref={containerRef}>
    </Root>
  );
}

PsqlComponent.propTypes = {
  params:PropTypes.shape({
    is_enable: PropTypes.bool,
    sid: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    db: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    server_type: PropTypes.string,
    role: PropTypes.string,
    platform: PropTypes.string,
    trans_id: PropTypes.number
  }),
  pgAdmin: PropTypes.object.isRequired,
  panelId: PropTypes.string,
  panelDocker: PropTypes.object,
};
