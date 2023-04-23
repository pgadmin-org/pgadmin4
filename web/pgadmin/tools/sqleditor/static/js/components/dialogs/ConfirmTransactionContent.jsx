import React from 'react';
import { useModalStyles } from '../../../../../../static/js/helpers/ModalProvider';
import gettext from 'sources/gettext';
import { Box } from '@material-ui/core';
import { DefaultButton, PrimaryButton } from '../../../../../../static/js/components/Buttons';
import CloseIcon from '@material-ui/icons/CloseRounded';
import HTMLReactParser from 'html-react-parser';
import { CommitIcon, RollbackIcon } from '../../../../../../static/js/components/ExternalIcon';
import PropTypes from 'prop-types';

export default function ConfirmTransactionContent({closeModal, text, onRollback, onCommit}) {
  const classes = useModalStyles();
  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box flexGrow="1" p={2}>{typeof(text) == 'string' ? HTMLReactParser(text) : text}</Box>
      <Box className={classes.footer}>
        <DefaultButton data-test="cancel" startIcon={<CloseIcon />} onClick={()=>{
          closeModal();
        }} >{gettext('Cancel')}</DefaultButton>
        <PrimaryButton data-test="rollback" className={classes.margin} startIcon={<RollbackIcon />} onClick={()=>{
          onRollback?.();
          closeModal();
        }} >{gettext('Rollback')}</PrimaryButton>
        <PrimaryButton data-test="commit" className={classes.margin} startIcon={<CommitIcon />} onClick={()=>{
          onCommit?.();
          closeModal();
        }} autoFocus={true} >{gettext('Commit')}</PrimaryButton>
      </Box>
    </Box>
  );
}

ConfirmTransactionContent.propTypes = {
  closeModal: PropTypes.func,
  text: PropTypes.string,
  onRollback: PropTypes.func,
  onCommit: PropTypes.func
};
