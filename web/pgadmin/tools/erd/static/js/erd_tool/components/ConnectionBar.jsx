/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useMemo } from 'react';
import { styled } from '@mui/material/styles';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import { DefaultButton, PgButtonGroup, PgIconButton } from '../../../../../../static/js/components/Buttons';
import { Box, Tooltip, CircularProgress } from '@mui/material';
import { ConnectedIcon, DisconnectedIcon } from '../../../../../../static/js/components/ExternalIcon';

const StyledBox = styled(Box)(({theme}) => ({
  padding: '2px 4px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: theme.otherVars.editorToolbarBg,
  flexWrap: 'wrap',
  '& .Status-connectionButton': {
    display: 'flex',
    width: '450px',
    backgroundColor: theme.palette.default.main,
    color: theme.palette.default.contrastText,
    border: '1px solid ' + theme.palette.default.borderColor,
    justifyContent: 'flex-start',
  }
}));

export const STATUS = {
  CONNECTED: 1,
  DISCONNECTED: 2,
  CONNECTING: 3,
  FAILED: 4,
};

function ConnectionStatusIcon({status}) {
  if(status == STATUS.CONNECTING) {
    return <CircularProgress style={{height: '18px', width: '18px'}} />;
  } else if(status == STATUS.CONNECTED || status == STATUS.FAILED) {
    return <ConnectedIcon />;
  } else {
    return <DisconnectedIcon />;
  }
}

ConnectionStatusIcon.propTypes = {
  status: PropTypes.oneOf(Object.values(STATUS)).isRequired,
};

/* The connection bar component */
export default function ConnectionBar({status, bgcolor, fgcolor, title}) {

  const connTitle = useMemo(()=>{
    if(status == STATUS.CONNECTED) {
      return gettext('Connected');
    } else if(status == STATUS.CONNECTING) {
      return gettext('Connecting');
    } else if(status == STATUS.DISCONNECTED) {
      return gettext('Disconnected');
    } else if(status == STATUS.FAILED) {
      return gettext('Failed');
    }
  }, [status]);
  return (
    <StyledBox>
      <PgButtonGroup size="small">
        <PgIconButton
          title={connTitle}
          icon={<ConnectionStatusIcon status={status} />}
          data-test="btn-conn-status"
        />
        <DefaultButton className='Status-connectionButton' style={{backgroundColor: bgcolor, color: fgcolor}} data-test="btn-conn-title">
          <Tooltip title={title}>
            <Box display="flex" width="100%">
              <Box textOverflow="ellipsis" overflow="hidden" marginRight="auto">
                {status == STATUS.CONNECTING && (gettext('(Obtaining connection...)')+' ')}
                {status == STATUS.FAILED && (gettext('(Connection failed)')+' ')}
                {title}
              </Box>
            </Box>
          </Tooltip>
        </DefaultButton>
      </PgButtonGroup>
    </StyledBox>
  );
}

ConnectionBar.propTypes = {
  status: PropTypes.oneOf(Object.values(STATUS)).isRequired,
  bgcolor: PropTypes.string,
  fgcolor: PropTypes.string,
  title: PropTypes.string.isRequired,
};
