/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import React, { useState, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';

import { Box } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/CloseRounded';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';

import gettext from 'sources/gettext';

import { DefaultButton, PrimaryButton } from '../components/Buttons';
import { useModalStyles } from '../helpers/ModalProvider';
import { FormFooterMessage, InputText, MESSAGE_TYPE } from '../components/FormComponents';

export default function RenameTabContent({ panelId, panelDocker, closeModal}) {
  const classes = useModalStyles();
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
    <Box display="flex" flexDirection="column" className={classes.container} ref={containerRef}>
      <Box padding="8px">
        <Box marginBottom="4px">Current: {initialTitle}</Box>
        <InputText type="text" value={formData['title']} controlProps={{ maxLength: null }}
          onChange={(e) => onTextChange(e, 'title')} onKeyDown={(e) => onKeyDown(e)} autoFocus />
      </Box>
      <FormFooterMessage type={MESSAGE_TYPE.ERROR} message={!isValid ? gettext('Title cannot be empty') : ''}
        closable={false} style={{position: 'initial'}} />
      <Box className={classes.footer}>
        <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={() => {
          closeModal();
        }} >{gettext('Cancel')}</DefaultButton>
        <PrimaryButton data-test="save" startIcon={<CheckRoundedIcon />} onClick={onOkClick} className={classes.margin} disabled={!isValid}>
          {gettext('OK')}
        </PrimaryButton>
      </Box>
    </Box>
  );
}

RenameTabContent.propTypes = {
  panelId: PropTypes.string,
  panelDocker: PropTypes.object,
  closeModal: PropTypes.func,
};
