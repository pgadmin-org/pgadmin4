import { styled } from '@mui/material/styles';
import React from 'react';
import { QueryToolEventsContext } from '../QueryToolComponent';
import { QUERY_TOOL_EVENTS } from '../QueryToolConstants';

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
  return <StyledDiv tabIndex="0">{messageText}</StyledDiv>;
}
