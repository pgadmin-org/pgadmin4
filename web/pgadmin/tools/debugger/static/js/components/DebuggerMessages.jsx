import { styled } from '@mui/material/styles';
import React from 'react';
import { DebuggerEventsContext } from './DebuggerComponent';
import { DEBUGGER_EVENTS } from '../DebuggerConstants';


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

export default function DebuggerMessages() {

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
  return <StyledDiv tabIndex="0" id='debugger-msg'>{messageText}</StyledDiv>;
}
