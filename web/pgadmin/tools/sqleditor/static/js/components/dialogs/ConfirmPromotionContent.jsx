import React, { useState } from 'react';
import { ModalContent } from '../../../../../../static/js/components/ModalContent';
import gettext from 'sources/gettext';
import { Box } from '@mui/material';
import { DefaultButton, PrimaryButton } from '../../../../../../static/js/components/Buttons';
import CloseIcon from '@mui/icons-material/CloseRounded';
import HTMLReactParser from 'html-react-parser';
import PropTypes from 'prop-types';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { InputCheckbox } from '../../../../../../static/js/components/FormComponents';
import { styled } from '@mui/material/styles';

const StyledFooter = styled('div')(({theme})=>({
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0.5rem',
  ...theme.mixins.panelBorder?.top,
  '& .margin': {
    marginLeft: '0.25rem',
  },
}));

export default function ConfirmPromotionContent({ onContinue, onClose, closeModal, text }) {
  const [formData, setFormData] = useState({
    save_user_choice: false
  });

  return (
    <ModalContent>
      <Box flexGrow="1" p={2}>{typeof (text) == 'string' ? HTMLReactParser(text) : text}</Box>
      <StyledFooter>
        <InputCheckbox controlProps={{ label: gettext('Don\'t ask again') }} value={formData['save_user_choice']}
          onChange={(e) => setFormData((prev) => ({ ...prev, 'save_user_choice': e.target.checked }))} />
        <Box>
          <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={() => {
            onClose?.();
            closeModal();
          }} >{gettext('Cancel')}</DefaultButton>
          <PrimaryButton data-test="Continue" className={'margin'} startIcon={<CheckRounded />} onClick={() => {
            let postFormData = new FormData();
            postFormData.append('pref_data', JSON.stringify([{ 'name': 'view_edit_promotion_warning', 'value': !formData.save_user_choice, 'module': 'sqleditor' }]));
            onContinue?.(postFormData);
            closeModal();
          }} autoFocus={true} >{gettext('Continue')}</PrimaryButton>
        </Box>
      </StyledFooter>
    </ModalContent>
  );
}

ConfirmPromotionContent.propTypes = {
  closeModal: PropTypes.func,
  text: PropTypes.string,
  onContinue: PropTypes.func,
  onClose: PropTypes.func
};
