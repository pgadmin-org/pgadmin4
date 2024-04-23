import React from 'react';
import { ModalContent, ModalFooter } from '../../../../../../static/js/components/ModalContent';
import gettext from 'sources/gettext';
import { Box } from '@mui/material';
import { DefaultButton, PrimaryButton } from '../../../../../../static/js/components/Buttons';
import CloseIcon from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import HTMLReactParser from 'html-react-parser';
import PropTypes from 'prop-types';

export default function CloseRunningDialog({closeModal, text, onYes}) {
  return (
    <ModalContent>
      <Box flexGrow="1" p={2}>{typeof(text) == 'string' ? HTMLReactParser(text) : text}</Box>
      <ModalFooter>
        <DefaultButton data-test="no" startIcon={<CloseIcon />} onClick={()=>{
          closeModal();
        }} >{gettext('No')}</DefaultButton>
        <PrimaryButton data-test="yes" startIcon={<CheckRoundedIcon />} onClick={()=>{
          onYes?.();
          closeModal();
        }} >{gettext('Yes')}</PrimaryButton>
      </ModalFooter>
    </ModalContent>
  );
}

CloseRunningDialog.propTypes = {
  closeModal: PropTypes.func,
  text: PropTypes.string,
  onYes: PropTypes.func,
};
