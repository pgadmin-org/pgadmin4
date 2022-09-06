import React from 'react';
import { useModalStyles } from '../helpers/ModalProvider';
import gettext from 'sources/gettext';
import { Box } from '@material-ui/core';
import { DefaultButton, PrimaryButton } from '../components/Buttons';
import CloseIcon from '@material-ui/icons/CloseRounded';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import DeleteRoundedIcon from '@material-ui/icons/DeleteRounded';
import HTMLReactParser from 'html-react-parser';
import PropTypes from 'prop-types';

export default function ConfirmSaveContent({closeModal, text, onDontSave, onSave}) {
  const classes = useModalStyles();
  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box flexGrow="1" p={2}>{typeof(text) == 'string' ? HTMLReactParser(text) : text}</Box>
      <Box className={classes.footer}>
        <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={()=>{
          closeModal();
        }} >{gettext('Cancel')}</DefaultButton>
        <DefaultButton data-test="dont-save" className={classes.margin} startIcon={<DeleteRoundedIcon />} onClick={()=>{
          onDontSave?.();
          closeModal();
        }} >{gettext('Don\'t save')}</DefaultButton>
        <PrimaryButton data-test="save" className={classes.margin} startIcon={<CheckRoundedIcon />} onClick={()=>{
          onSave?.();
          closeModal();
        }} autoFocus={true} >{gettext('Save')}</PrimaryButton>
      </Box>
    </Box>
  );
}

ConfirmSaveContent.propTypes = {
  closeModal: PropTypes.func,
  text: PropTypes.string,
  onDontSave: PropTypes.func,
  onSave: PropTypes.func
};
