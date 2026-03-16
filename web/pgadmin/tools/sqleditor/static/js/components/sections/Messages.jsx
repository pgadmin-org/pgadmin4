/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { styled } from '@mui/material/styles';
import React from 'react';
import { QueryToolEventsContext } from '../QueryToolComponent';
import { QUERY_TOOL_EVENTS } from '../QueryToolConstants';
import gettext from 'sources/gettext';
import { PgMenu, PgMenuItem } from '../../../../../../static/js/components/Menu';

const StyledDiv = styled('div')(({theme}) => ({
  whiteSpace: 'pre-wrap',
  fontFamily: '"Source Code Pro", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  padding: '5px 10px',
  overflow: 'auto',
  height: '100%',
  fontSize: '12px',
  userSelect: 'text',
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  ...theme.mixins.fontSourceCode,
}));

export function Messages() {

  const [messageText, setMessageText] = React.useState('');
  const [contextPos, setContextPos] = React.useState(null);
  const containerRef = React.useRef(null);
  const eventBus = React.useContext(QueryToolEventsContext);
  React.useEffect(()=>{
    eventBus.registerListener(QUERY_TOOL_EVENTS.SET_MESSAGE, (text, append=false)=>{
      setMessageText((prev)=>{
        if(append) {
          return prev+text;
        }
        return text;
      });
    });
  }, []);

  const handleContextMenu = React.useCallback((e)=>{
    e.preventDefault();
    setContextPos({x: e.clientX, y: e.clientY});
  }, []);

  const selectAll = React.useCallback(()=>{
    if(containerRef.current) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(containerRef.current);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    setContextPos(null);
  }, []);

  const copyToClipboard = React.useCallback(()=>{
    const selection = window.getSelection();
    const text = selection.toString();
    if(text) {
      navigator.clipboard.writeText(text);
    }
    setContextPos(null);
  }, []);

  return <>
    <StyledDiv tabIndex="0" ref={containerRef} onContextMenu={handleContextMenu}>
      {messageText}
    </StyledDiv>
    <PgMenu
      anchorPoint={contextPos ? {x: contextPos.x, y: contextPos.y} : undefined}
      open={Boolean(contextPos)}
      onClose={()=>setContextPos(null)}
      label="messages-context"
      portal
    >
      <PgMenuItem onClick={copyToClipboard}>{gettext('Copy')}</PgMenuItem>
      <PgMenuItem onClick={selectAll}>{gettext('Select All')}</PgMenuItem>
    </PgMenu>
  </>;
}
