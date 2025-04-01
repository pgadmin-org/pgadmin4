/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import React, { useState, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';

import { Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

import gettext from 'sources/gettext';

import { DefaultButton, PrimaryButton } from '../components/Buttons';
import { ModalContent, ModalFooter } from '../../../static/js/components/ModalContent';
import { FormFooterMessage, InputText, MESSAGE_TYPE } from '../components/FormComponents';

export default function RenameTabContent({ panelId, panelDocker, closeModal}) {
  const containerRef = useRef();
  const okBtnRef = useRef();
  const panelData = useMemo(()=>panelDocker.find(panelId));
  const initialTitle = panelData.internal?.isDirty ? panelData?.internal?.title.slice(0, -1) : panelData?.internal?.title;
  const [formData, setFormData] = useState({
    title: initialTitle,
  });

  const onTextChange = (e, id) => {
    let val = e;
    if (e?.target) {
      val = e.target.value;
    }
    setFormData((prev) => ({ ...prev, [id]: val }));
  };

  const onKeyDown = (e) => {
    // If enter key is pressed then click on OK button
    if (e.key === 'Enter') {
      okBtnRef.current?.click();
    }
  };

  const onOkClick = ()=>{
    if(panelData.internal.isDirty) {
      panelDocker.setTitle(panelId, formData.title+'*');
    } else {
      panelDocker.setTitle(panelId, formData.title);
    }
    if(_.isUndefined(panelData.internal.orig_title)) {
      panelDocker.setInternalAttrs(panelId, {
        orig_title: initialTitle
      });
    }
    closeModal();
  };

  const isValid = formData['title'].length != 0;

  return (
    <ModalContent ref={containerRef}>
      <Box padding="8px">
        <Box marginBottom="4px">Current: {initialTitle}</Box>
        <InputText type="text" value={formData['title']} controlProps={{ maxLength: null }}
          onChange={(e) => onTextChange(e, 'title')} onKeyDown={(e) => onKeyDown(e)} autoFocus />
      </Box>
      <FormFooterMessage type={MESSAGE_TYPE.ERROR} message={!isValid ? gettext('Title cannot be empty') : ''}
        closable={false} style={{position: 'initial'}} />
      <ModalFooter>
        <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={() => {
          closeModal();
        }} >{gettext('Cancel')}</DefaultButton>
        <PrimaryButton data-test="save" startIcon={<CheckRoundedIcon />} onClick={onOkClick} disabled={!isValid}>
          {gettext('OK')}
        </PrimaryButton>
      </ModalFooter>
    </ModalContent>
  );
}

RenameTabContent.propTypes = {
  panelId: PropTypes.string,
  panelDocker: PropTypes.object,
  closeModal: PropTypes.func,
};
