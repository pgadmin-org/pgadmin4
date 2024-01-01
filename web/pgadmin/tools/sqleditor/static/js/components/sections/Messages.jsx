/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { makeStyles } from '@material-ui/styles';
import React from 'react';
import { QueryToolEventsContext } from '../QueryToolComponent';
import { QUERY_TOOL_EVENTS } from '../QueryToolConstants';

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

export function Messages() {
  const classes = useStyles();
  const [messageText, setMessageText] = React.useState('');
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
  return (
    <div className={classes.root} tabIndex="0">{messageText}</div>
  );
}
