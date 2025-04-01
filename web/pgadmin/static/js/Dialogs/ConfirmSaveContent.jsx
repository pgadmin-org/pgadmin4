import React from 'react';
import { ModalContent, ModalFooter } from '../../../static/js/components/ModalContent';
import gettext from 'sources/gettext';
import { Box } from '@mui/material';
import { DefaultButton, PrimaryButton } from '../components/Buttons';
import CloseIcon from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import HTMLReactParser from 'html-react-parser';
import PropTypes from 'prop-types';

export default function ConfirmSaveContent({closeModal, text, onDontSave, onSave}) {
  return (
    <ModalContent>
      <Box flexGrow="1" p={2}>{typeof(text) == 'string' ? HTMLReactParser(text) : text}</Box>
      <ModalFooter>
        <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={()=>{
          closeModal();
        }} >{gettext('Cancel')}</DefaultButton>
        <DefaultButton data-test="dont-save"  startIcon={<DeleteRoundedIcon />} onClick={()=>{
          onDontSave?.();
          closeModal();
        }} >{gettext('Don\'t save')}</DefaultButton>
        <PrimaryButton data-test="save" startIcon={<CheckRoundedIcon />} onClick={()=>{
          onSave?.();
          closeModal();
        }} autoFocus={true} >{gettext('Save')}</PrimaryButton>
      </ModalFooter>
    </ModalContent>
  );
}

ConfirmSaveContent.propTypes = {
  closeModal: PropTypes.func,
  text: PropTypes.string,
  onDontSave: PropTypes.func,
  onSave: PropTypes.func
};
