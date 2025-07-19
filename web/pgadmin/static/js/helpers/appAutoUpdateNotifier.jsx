/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/CloseRounded';
import PropTypes from 'prop-types';
import { DefaultButton, PgIconButton } from '../components/Buttons';
import pgAdmin from 'sources/pgadmin';

const StyledBox = styled(Box)(({theme}) => ({
  borderRadius: theme.shape.borderRadius,
  padding: '0.25rem 1rem 1rem',
  minWidth: '325px',
  maxWidth: '400px',
  ...theme.mixins.panelBorder.all,
  '&.UpdateWarningNotifier-containerWarning': {
    borderColor: theme.palette.warning.main,
    backgroundColor: theme.palette.warning.light,
  },
  '& .UpdateWarningNotifier-containerHeader': {
    height: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 'bold',
    alignItems: 'center',
    borderTopLeftRadius: 'inherit',
    borderTopRightRadius: 'inherit',
    '& .UpdateWarningNotifier-iconWarning': {
      color: theme.palette.warning.main,
    },
  },
  '&.UpdateWarningNotifier-containerBody': {
    marginTop: '1rem',
    overflowWrap: 'break-word',
  },
}));

const activeWarningKeys = new Set();

function UpdateWarningNotifier({desc, title, onClose, onClick, status, uniqueKey}) {
  const handleClose = () => {
    if (onClose) onClose();
    if (uniqueKey) {
      activeWarningKeys.delete(uniqueKey);
    }
  };
  return (
    <StyledBox className={'UpdateWarningNotifier-containerWarning'} data-test={'Update-popup-warning'}>
      <Box display="flex" justifyContent="space-between" className='UpdateWarningNotifier-containerHeader'>
        <Box marginRight={'1rem'}>{title}</Box>
        <PgIconButton size="xs" noBorder icon={<CloseIcon />} onClick={handleClose} title={'Close'} className={'UpdateWarningNotifier-iconWarning'} />
      </Box>
      <Box className='UpdateWarningNotifier-containerBody'>
        {desc && <Box>{desc}</Box>}
        <Box display="flex">
          {onClick && <Box marginTop={'1rem'} display="flex">
            <DefaultButton color={'warning'} onClick={()=>{
              onClick();
              handleClose();
            }}>{status == 'download_update' ? 'Download Update' : 'Install and Restart'}</DefaultButton>
          </Box>}
          {status == 'update_downloaded' && <Box marginTop={'1rem'} display="flex" marginLeft={'1rem'}>
            <DefaultButton color={'default'} onClick={()=>{
              handleClose();
            }}>Install Later</DefaultButton>
          </Box>}
        </Box>
      </Box>
    </StyledBox>
  );
}
UpdateWarningNotifier.propTypes = {
  desc: PropTypes.string,
  title: PropTypes.string,
  onClose: PropTypes.func,
  onClick: PropTypes.func,
  status: PropTypes.string,
  uniqueKey: PropTypes.string,
};

export function appAutoUpdateNotifier(desc, type, onClick, hideDuration=null, title='', status='download_update') {
  const uniqueKey = `${title}::${desc}`;

  // Check if this warning is already active except error type
  if (activeWarningKeys.has(uniqueKey) && type !== 'error') {
    // Already showing, do not show again
    return;
  }

  // Mark this warning as active
  activeWarningKeys.add(uniqueKey);
  if (type == 'warning') {
    pgAdmin.Browser.notifier.notify(
      <UpdateWarningNotifier
        title={title}
        desc={desc}
        onClick={onClick}
        status={status}
        uniqueKey={uniqueKey}
        onClose={() => {
          // Remove from active keys when closed
          activeWarningKeys.delete(uniqueKey);
        }}
      />, null
    );
  } else if(type == 'success') {
    pgAdmin.Browser.notifier.success(desc, hideDuration);
  } else if(type == 'info') {
    pgAdmin.Browser.notifier.info(desc, hideDuration);
  } else if(type == 'error') {
    pgAdmin.Browser.notifier.error(desc, hideDuration);
  }

  // Remove from active keys for valid hideDuration passed in args
  setTimeout(()=>{
    hideDuration && activeWarningKeys.delete(uniqueKey);
  });
}
