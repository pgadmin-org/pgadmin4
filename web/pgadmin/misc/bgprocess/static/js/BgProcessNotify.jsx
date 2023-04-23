import { Box, makeStyles } from '@material-ui/core';
import React from 'react';
import Notifier from '../../../../static/js/helpers/Notifier';
import CloseIcon from '@material-ui/icons/CloseRounded';
import { DefaultButton, PgIconButton } from '../../../../static/js/components/Buttons';
import clsx from 'clsx';
import DescriptionOutlinedIcon from '@material-ui/icons/DescriptionOutlined';
import { BgProcessManagerProcessState } from './BgProcessManager';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';


const useStyles = makeStyles((theme)=>({
  container: {
    borderRadius: theme.shape.borderRadius,
    padding: '0.25rem 1rem 1rem',
    minWidth: '325px',
    ...theme.mixins.panelBorder.all,
  },
  containerHeader: {
    height: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 'bold',
    alignItems: 'center',
    borderTopLeftRadius: 'inherit',
    borderTopRightRadius: 'inherit',
  },
  containerBody: {
    marginTop: '1rem',
    overflowWrap: 'break-word',
  },
  containerSuccess: {
    borderColor: theme.palette.success.main,
    backgroundColor: theme.palette.success.light,
  },
  iconSuccess: {
    color: theme.palette.success.main,
  },
  containerError: {
    borderColor: theme.palette.error.main,
    backgroundColor: theme.palette.error.light,
  },
  iconError: {
    color: theme.palette.error.main,
  },
}));

function ProcessNotifyMessage({title, desc, onClose, onViewProcess, success=true, dataTestSuffix=''}) {
  const classes = useStyles();
  return (
    <Box className={clsx(classes.container, (success ? classes.containerSuccess : classes.containerError))} data-test={'process-popup-' + dataTestSuffix}>
      <Box display="flex" justifyContent="space-between" className={classes.containerHeader}>
        <Box marginRight={'1rem'}>{title}</Box>
        <PgIconButton size="xs" noBorder icon={<CloseIcon />} onClick={onClose} title={'Close'} className={success ? classes.iconSuccess : classes.iconError} />
      </Box>
      <Box className={classes.containerBody}>
        <Box>{desc}</Box>
        <Box marginTop={'1rem'} display="flex">
          <DefaultButton startIcon={<DescriptionOutlinedIcon />} onClick={()=>{
            onViewProcess();
            onClose();
          }}>View Processes</DefaultButton>
        </Box>
      </Box>
    </Box>
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
  Notifier.notify(
    <ProcessNotifyMessage title={gettext('Process started')} desc={desc} onViewProcess={onViewProcess} dataTestSuffix="start"/>,
    null
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

  Notifier.notify(
    <ProcessNotifyMessage title={title} desc={desc} onViewProcess={onViewProcess} success={success} dataTestSuffix="end"/>,
    null
  );
}

