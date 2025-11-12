/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import { styled } from '@mui/material/styles';
import { Box, CircularProgress, Tooltip } from '@mui/material';
import { DefaultButton, PgButtonGroup, PgIconButton } from '../../../../../../static/js/components/Buttons';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { ConnectedIcon, DisconnectedIcon, QueryToolIcon } from '../../../../../../static/js/components/ExternalIcon';
import { QueryToolContext } from '../QueryToolComponent';
import { CONNECTION_STATUS, CONNECTION_STATUS_MESSAGE } from '../QueryToolConstants';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import QueryBuilderRoundedIcon from '@mui/icons-material/QueryBuilderRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import { PgMenu, PgMenuItem } from '../../../../../../static/js/components/Menu';
import gettext from 'sources/gettext';
import RotateLeftRoundedIcon from '@mui/icons-material/RotateLeftRounded';
import PropTypes from 'prop-types';
import { useKeyboardShortcuts } from '../../../../../../static/js/custom_hooks';
import CustomPropTypes from '../../../../../../static/js/custom_prop_types';

const Root = styled('div')(({theme}) => ({
  '.ConnectionBar-root': {
    padding: '2px 4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: theme.otherVars.editorToolbarBg,
    '& .ConnectionBar-connectionButton': {
      display: 'flex',
      width: '450px',
      backgroundColor: theme.palette.default.main,
      color: theme.palette.default.contrastText,
      border: '1px solid ' + theme.palette.default.borderColor,
      justifyContent: 'flex-start',
    },
  },
  '.ConnectionBar-menu': {
    '& .szh-menu': {
      minWidth: '450px',
    }
  },
}));

function ConnectionStatusIcon({connected, connecting, status}) {
  if(connecting) {
    return <CircularProgress style={{height: '18px', width: '18px'}} />;
  } else if(connected) {
    switch (status) {
    case CONNECTION_STATUS.TRANSACTION_STATUS_ACTIVE:
      return <HourglassEmptyRoundedIcon />;
    case CONNECTION_STATUS.TRANSACTION_STATUS_INTRANS:
      return <QueryBuilderRoundedIcon />;
    case CONNECTION_STATUS.TRANSACTION_STATUS_INERROR:
      return <ErrorOutlineRoundedIcon />;
    case CONNECTION_STATUS.TRANSACTION_STATUS_UNKNOWN:
      return <ReportProblemRoundedIcon />;
    default:
      return <ConnectedIcon />;
    }
  } else {
    return <DisconnectedIcon />;
  }
}

ConnectionStatusIcon.propTypes = {
  connected: PropTypes.bool,
  connecting: PropTypes.bool,
  status: PropTypes.oneOf(Object.values(CONNECTION_STATUS)),
};

export function ConnectionBar({connected, connecting, connectionStatus, connectionStatusMsg,
  connectionList, onConnectionChange, onNewConnClick, onNewQueryToolClick, onResetLayout, containerRef}) {

  const connMenuRef = React.useRef();
  const [connDropdownOpen, setConnDropdownOpen] = React.useState(false);
  const queryToolCtx = React.useContext(QueryToolContext);
  const onConnItemClick = (e)=>{
    if(!e.value.is_selected) {
      onConnectionChange(e.value);
    }
    e.keepOpen = false;
  };

  useKeyboardShortcuts([
    {
      shortcut: queryToolCtx.preferences?.browser?.sub_menu_query_tool,
      options: {
        callback: onNewQueryToolClick
      }
    },
  ], containerRef);

  const connTitle = React.useMemo(()=>_.find(connectionList, (c)=>c.is_selected)?.conn_title, [connectionList]);
  return (
    (<Root>
      <Box className='ConnectionBar-root'>
        <PgButtonGroup size="small">
          {queryToolCtx.preferences?.sqleditor?.connection_status &&
          <PgIconButton title={CONNECTION_STATUS_MESSAGE[connected ? connectionStatus : -1] ?? connectionStatusMsg}
            icon={<ConnectionStatusIcon connecting={connecting} status={connectionStatus} connected={connected}/>}
          />}
          <DefaultButton className='ConnectionBar-connectionButton' ref={connMenuRef}
            onClick={queryToolCtx.params.is_query_tool ? ()=>setConnDropdownOpen(true) : undefined}
            style={{backgroundColor: queryToolCtx.params.bgcolor, color: queryToolCtx.params.fgcolor}}
          >
            <Tooltip title={queryToolCtx.params.is_query_tool ? '' : connTitle}>
              <Box display="flex" width="100%">
                <Box textOverflow="ellipsis" overflow="hidden" marginRight="auto">{connecting && gettext('(Obtaining connection)')}{connTitle}</Box>
                {queryToolCtx.params.is_query_tool && <Box display="flex" alignItems="center"><KeyboardArrowDownIcon /></Box>}
              </Box>
            </Tooltip>
          </DefaultButton>
          <PgIconButton title={gettext('New query tool for current connection')} icon={<QueryToolIcon />}
            shortcut={queryToolCtx.preferences?.browser?.sub_menu_query_tool} onClick={onNewQueryToolClick}/>
        </PgButtonGroup>
        <PgButtonGroup size="small" variant="text" style={{marginLeft: 'auto'}}>
          <PgIconButton title={gettext('Reset layout')} icon={<RotateLeftRoundedIcon />} onClick={onResetLayout}/>
        </PgButtonGroup>
      </Box>
      <PgMenu
        anchorRef={connMenuRef}
        open={connDropdownOpen}
        onClose={()=>{setConnDropdownOpen(false);}}
        className='ConnectionBar-menu'
      >
        {(connectionList||[]).map((conn, i)=>{
          return (
            <PgMenuItem key={i+conn.conn_title} hasCheck checked={conn.is_selected} value={conn}
              onClick={onConnItemClick}>{conn.conn_title}</PgMenuItem>
          );
        })}
        <PgMenuItem onClick={onNewConnClick}>{`< ${gettext('New Connection...')} >`}</PgMenuItem>
      </PgMenu>
    </Root>)
  );
}

ConnectionBar.propTypes = {
  connected: PropTypes.bool,
  connecting: PropTypes.bool,
  connectionStatus: PropTypes.oneOf(Object.values(CONNECTION_STATUS)),
  connectionStatusMsg: PropTypes.string,
  connectionList: PropTypes.array,
  onConnectionChange: PropTypes.func,
  onNewConnClick: PropTypes.func,
  onNewQueryToolClick: PropTypes.func,
  onResetLayout: PropTypes.func,
  containerRef: CustomPropTypes.ref,
};
