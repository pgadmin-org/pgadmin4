import React from 'react';
import { ModalContent, ModalFooter } from '../../../../../../static/js/components/ModalContent';
import gettext from 'sources/gettext';
import { Box } from '@mui/material';
import { DefaultButton, PrimaryButton } from '../../../../../../static/js/components/Buttons';
import CloseIcon from '@mui/icons-material/CloseRounded';
import HTMLReactParser from 'html-react-parser';
import { CommitIcon, RollbackIcon } from '../../../../../../static/js/components/ExternalIcon';
import PropTypes from 'prop-types';

export default function ConfirmTransactionContent({closeModal, text, onRollback, onCommit}) {
  return (
    <ModalContent>
      <Box flexGrow="1" p={2}>{typeof(text) == 'string' ? HTMLReactParser(text) : text}</Box>
      <ModalFooter>
        <DefaultButton data-test="cancel" startIcon={<CloseIcon />} onClick={()=>{
          closeModal();
        }} >{gettext('Cancel')}</DefaultButton>
        <PrimaryButton data-test="rollback" startIcon={<RollbackIcon />} onClick={()=>{
          onRollback?.();
          closeModal();
        }} >{gettext('Rollback')}</PrimaryButton>
        <PrimaryButton data-test="commit" startIcon={<CommitIcon />} onClick={()=>{
          onCommit?.();
          closeModal();
        }} autoFocus={true} >{gettext('Commit')}</PrimaryButton>
      </ModalFooter>
    </ModalContent>
  );
}

ConfirmTransactionContent.propTypes = {
  closeModal: PropTypes.func,
  text: PropTypes.string,
  onRollback: PropTypes.func,
  onCommit: PropTypes.func
};
