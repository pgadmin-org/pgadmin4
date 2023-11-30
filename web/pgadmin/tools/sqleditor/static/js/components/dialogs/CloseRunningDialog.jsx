import React from 'react';
import { useModalStyles } from '../../../../../../static/js/helpers/ModalProvider';
import gettext from 'sources/gettext';
import { Box } from '@material-ui/core';
import { DefaultButton, PrimaryButton } from '../../../../../../static/js/components/Buttons';
import CloseIcon from '@material-ui/icons/CloseRounded';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import HTMLReactParser from 'html-react-parser';
import PropTypes from 'prop-types';

export default function CloseRunningDialog({closeModal, text, onYes}) {
  const classes = useModalStyles();
  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box flexGrow="1" p={2}>{typeof(text) == 'string' ? HTMLReactParser(text) : text}</Box>
      <Box className={classes.footer}>
        <DefaultButton data-test="no" startIcon={<CloseIcon />} onClick={()=>{
          closeModal();
        }} >{gettext('No')}</DefaultButton>
        <PrimaryButton data-test="yes" className={classes.margin} startIcon={<CheckRoundedIcon />} onClick={()=>{
          onYes?.();
          closeModal();
        }} >{gettext('Yes')}</PrimaryButton>
      </Box>
    </Box>
  );
}

CloseRunningDialog.propTypes = {
  closeModal: PropTypes.func,
  text: PropTypes.string,
  onYes: PropTypes.func,
};
