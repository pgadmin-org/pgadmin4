/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { ModalContent, ModalFooter } from '../components/ModalContent';
import gettext from 'sources/gettext';
import { Box } from '@mui/material';
import { DefaultButton, PrimaryButton } from '../components/Buttons';
import CloseIcon from '@mui/icons-material/CloseRounded';
import MergeTypeRoundedIcon from '@mui/icons-material/MergeTypeRounded';
import FindReplaceRoundedIcon from '@mui/icons-material/FindReplaceRounded';
import PropTypes from 'prop-types';

export default function ConfirmFileDropContent({closeModal, onMerge, onReplace}) {
  return (
    <ModalContent>
      <Box flexGrow="1" p={2}>
        {gettext('The editor already has content. Do you want to replace it with the dropped file, or merge the file content at the current cursor position?')}
      </Box>
      <ModalFooter>
        <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={()=>{
          closeModal();
        }} >{gettext('Cancel')}</DefaultButton>
        <DefaultButton data-test="merge" startIcon={<MergeTypeRoundedIcon />} onClick={()=>{
          onMerge?.();
          closeModal();
        }} >{gettext('Merge')}</DefaultButton>
        <PrimaryButton data-test="replace" startIcon={<FindReplaceRoundedIcon />} onClick={()=>{
          onReplace?.();
          closeModal();
        }} autoFocus={true} >{gettext('Replace')}</PrimaryButton>
      </ModalFooter>
    </ModalContent>
  );
}

ConfirmFileDropContent.propTypes = {
  closeModal: PropTypes.func,
  onMerge: PropTypes.func,
  onReplace: PropTypes.func,
};
