import React, { useState } from 'react';
import { useModalStyles } from '../../../../../../static/js/helpers/ModalProvider';
import gettext from 'sources/gettext';
import { Box, makeStyles } from '@material-ui/core';
import { DefaultButton, PrimaryButton } from '../../../../../../static/js/components/Buttons';
import CloseIcon from '@material-ui/icons/CloseRounded';
import HTMLReactParser from 'html-react-parser';
import PropTypes from 'prop-types';
import CheckRounded from '@material-ui/icons/CheckRounded';
import { InputCheckbox } from '../../../../../../static/js/components/FormComponents';


const useStyles = makeStyles(() => ({
  saveChoice: {
    margin: '10px 0 10px 10px',
  }
}));


export default function ConfirmPromotionContent({ onContinue, onClose, closeModal, text }) {
  const [formData, setFormData] = useState({
    save_user_choice: false
  });

  const onDataChange = (e, id) => {
    let val = e;
    if (e?.target) {
      val = e.target.value;
    }
    setFormData((prev) => ({ ...prev, [id]: val }));
  };
  const modalClasses = useModalStyles();
  const classes = useStyles();

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box flexGrow="1" p={2}>{typeof (text) == 'string' ? HTMLReactParser(text) : text}</Box>
      <Box className={classes.saveChoice}>
        <InputCheckbox controlProps={{ label: gettext('Don\'t ask again') }} value={formData['save_user_choice']}
          onChange={(e) => onDataChange(e.target.checked, 'save_user_choice')} />
      </Box>
      <Box className={modalClasses.footer}>
        <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={() => {
          onClose?.();
          closeModal();
        }} >{gettext('Cancel')}</DefaultButton>
        <PrimaryButton data-test="Continue" className={modalClasses.margin} startIcon={<CheckRounded />} onClick={() => {
          let postFormData = new FormData();
          postFormData.append('pref_data', JSON.stringify([{ 'name': 'view_edit_promotion_warning', 'value': !formData.save_user_choice, 'module': 'sqleditor' }]));
          onContinue?.(postFormData);
          closeModal();
        }} autoFocus={true} >{gettext('Continue')}</PrimaryButton>
      </Box>
    </Box>
  );
}

ConfirmPromotionContent.propTypes = {
  closeModal: PropTypes.func,
  text: PropTypes.string,
  onContinue: PropTypes.func,
  onClose: PropTypes.func
};
