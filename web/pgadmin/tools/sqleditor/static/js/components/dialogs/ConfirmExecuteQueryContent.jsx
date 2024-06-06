import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import gettext from 'sources/gettext';
import { Box } from '@mui/material';
import { DefaultButton, PrimaryButton } from '../../../../../../static/js/components/Buttons';
import CloseIcon from '@mui/icons-material/CloseRounded';
import PropTypes from 'prop-types';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { InputCheckbox } from '../../../../../../static/js/components/FormComponents';
import CodeMirror from '../../../../../../static/js/components/ReactCodeMirror';

const StyledEditor = styled('div')(({theme})=>({
  flexGrow: 1,
  backgroundColor: theme.palette.background.default,
  padding: '1rem',
  '& .textarea': {
    ...theme.mixins.panelBorder?.all,
    outline: 0,
    resize: 'both',
    maxHeight: '500px',
    overflowY: 'scroll',
  },
}));

const StyledFooter = styled('div')(({theme})=>({
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0.5rem',
  ...theme.mixins.panelBorder?.top,
  '& .margin': {
    marginLeft: '0.25rem',
  },
}));

export default function ConfirmExecuteQueryContent({ onContinue, onClose, closeModal, text }) {
  const [formData, setFormData] = useState({
    save_user_choice: false
  });

  return (
    <>
      <StyledEditor>
        <Box>Do you want to run this query -</Box>
        <CodeMirror
          value={text || ''}
          className={'textarea'}
          readonly={true}
        />
      </StyledEditor>
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
            postFormData.append('pref_data', JSON.stringify([{ 'name': 'underlined_query_execute_warning', 'value': !formData.save_user_choice, 'module': 'sqleditor' }]));
            onContinue?.(postFormData);
            closeModal();
          }} autoFocus={true} >{gettext('Continue')}</PrimaryButton>
        </Box>
      </StyledFooter>
    </>
  );
}

ConfirmExecuteQueryContent.propTypes = {
  closeModal: PropTypes.func,
  text: PropTypes.string,
  onContinue: PropTypes.func,
  onClose: PropTypes.func
};
