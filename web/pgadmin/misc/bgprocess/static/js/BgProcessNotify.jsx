import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';
import CloseIcon from '@mui/icons-material/CloseRounded';
import { DefaultButton, PgIconButton } from '../../../../static/js/components/Buttons';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { BgProcessManagerProcessState } from './BgProcessConstants';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';

const StyledBox = styled(Box)(({theme}) => ({
  borderRadius: theme.shape.borderRadius,
  padding: '0.25rem 1rem 1rem',
  minWidth: '325px',
  ...theme.mixins.panelBorder.all,
  '&.BgProcessNotify-containerSuccess': {
    borderColor: theme.palette.success.main,
    backgroundColor: theme.palette.success.light,
  },
  '&.BgProcessNotify-containerError': {
    borderColor: theme.palette.error.main,
    backgroundColor: theme.palette.error.light,
  },
  '& .BgProcessNotify-containerHeader': {
    height: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 'bold',
    alignItems: 'center',
    borderTopLeftRadius: 'inherit',
    borderTopRightRadius: 'inherit',
    '& .BgProcessNotify-iconSuccess': {
      color: theme.palette.success.main,
    },
    '& .BgProcessNotify-iconError': {
      color: theme.palette.error.main,
    }
  },
  '&.BgProcessNotify-containerBody': {
    marginTop: '1rem',
    overflowWrap: 'break-word',
  },
}));

const AUTO_HIDE_DURATION = 10000;  // In milliseconds
function ProcessNotifyMessage({title, desc, onClose, onViewProcess, success=true, dataTestSuffix=''}) {
  return (
    <StyledBox className={(success ? 'BgProcessNotify-containerSuccess' : 'BgProcessNotify-containerError')} data-test={'process-popup-' + dataTestSuffix}>
      <Box display="flex" justifyContent="space-between" className='BgProcessNotify-containerHeader'>
        <Box marginRight={'1rem'}>{title}</Box>
        <PgIconButton size="xs" noBorder icon={<CloseIcon />} onClick={onClose} title={'Close'} className={success ? 'BgProcessNotify-iconSuccess' : 'BgProcessNotify-iconError'} />
      </Box>
      <Box className='BgProcessNotify-containerBody'>
        <Box>{desc}</Box>
        <Box marginTop={'1rem'} display="flex">
          <DefaultButton startIcon={<DescriptionOutlinedIcon />} onClick={()=>{
            onViewProcess();
            onClose();
          }}>View Processes</DefaultButton>
        </Box>
      </Box>
    </StyledBox>
  );
}
ProcessNotifyMessage.propTypes = {
  title: PropTypes.string.isRequired,
  desc: PropTypes.string.isRequired,
  onClose: PropTypes.func,
  onViewProcess: PropTypes.func,
  success: PropTypes.bool,
  dataTestSuffix: PropTypes.string,
};


export function processStarted(desc, onViewProcess) {
  pgAdmin.Browser.notifier.notify(
    <ProcessNotifyMessage title={gettext('Process started')} desc={desc} onViewProcess={onViewProcess} dataTestSuffix="start"/>,
    AUTO_HIDE_DURATION
  );
}

export function processCompleted(desc, process_state, onViewProcess) {
  let title = gettext('Process completed');
  let success = true;
  if(process_state == BgProcessManagerProcessState.PROCESS_TERMINATED) {
    title = gettext('Process terminated');
    success = false;
  } else if(process_state == BgProcessManagerProcessState.PROCESS_FAILED) {
    title = gettext('Process failed');
    success = false;
  }

  pgAdmin.Browser.notifier.notify(
    <ProcessNotifyMessage title={title} desc={desc} onViewProcess={onViewProcess} success={success} dataTestSuffix="end"/>,
    AUTO_HIDE_DURATION
  );
}
