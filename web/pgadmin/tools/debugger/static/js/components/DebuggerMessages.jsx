/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { makeStyles } from '@material-ui/styles';
import React from 'react';
import { DebuggerEventsContext } from './DebuggerComponent';
import { DEBUGGER_EVENTS } from '../DebuggerConstants';


const useStyles = makeStyles((theme)=>({
  root: {
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
  }
}));

export default function DebuggerMessages() {
  const classes = useStyles();
  const [messageText, setMessageText] = React.useState('');
  const eventBus = React.useContext(DebuggerEventsContext);
  React.useEffect(()=>{
    eventBus.registerListener(DEBUGGER_EVENTS.SET_MESSAGES, (text, append=false)=>{
      setMessageText((prev)=>{
        if(append) {
          return prev+text;
        }
        return text;
      });
    });
  }, []);
  return (
    <div className={classes.root} tabIndex="0" id='debugger-msg'>{messageText}</div>
  );
}
