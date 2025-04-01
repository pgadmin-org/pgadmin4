/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useState, useRef, useEffect } from 'react';
import gettext from 'sources/gettext';
import { Box } from '@mui/material';
import { DefaultButton, PrimaryButton } from '../components/Buttons';
import CloseIcon from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PropTypes from 'prop-types';
import { ModalContent, ModalFooter } from '../../../static/js/components/ModalContent';
import { InputText } from '../components/FormComponents';
import { isEmptyString } from '../../../static/js/validators';

export default function NamedRestoreContent({closeModal, onOK, setHeight}) {
  const containerRef = useRef();
  const firstEleRef = useRef();
  const okBtnRef = useRef();
  const [formData, setFormData] = useState({
    namedRestorePoint: ''
  });

  const onTextChange = (e, id) => {
    let val = e;
    if(e?.target) {
      val = e.target.value;
    }
    setFormData((prev)=>({...prev, [id]: val}));
  };

  const onKeyDown = (e) => {
    // If enter key is pressed then click on OK button
    if (e.key === 'Enter') {
      okBtnRef.current?.click();
    }
  };

  useEffect(()=>{
    setTimeout(()=>{
      firstEleRef.current?.focus();
    }, 275);
  }, []);

  useEffect(()=>{
    setHeight?.(containerRef.current?.offsetHeight);
  }, [containerRef.current]);

  const isOKDisabled = isEmptyString(formData.namedRestorePoint);

  return (
    <ModalContent ref={containerRef}>
      <Box flexGrow="1" p={2}>
        <Box>
          <span style={{fontWeight: 'bold'}}>
            {gettext('Enter the name of the restore point to add')}
          </span>
        </Box>
        <Box marginTop='12px'>
          <InputText inputRef={firstEleRef} type="text" value={formData['namedRestorePoint']}
            onChange={(e)=>onTextChange(e, 'namedRestorePoint')} onKeyDown={(e)=>onKeyDown(e)}/>
        </Box>
      </Box>
      <ModalFooter>
        <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={()=>{
          closeModal();
        }} >{gettext('Cancel')}</DefaultButton>
        <PrimaryButton ref={okBtnRef} data-test="save" disabled={isOKDisabled} startIcon={<CheckRoundedIcon />} onClick={()=>{
          let postFormData = new FormData();
          postFormData.append('value', formData.namedRestorePoint);
          onOK?.(postFormData);
          closeModal();
        }} >{gettext('OK')}</PrimaryButton>
      </ModalFooter>
    </ModalContent>
  );
}

NamedRestoreContent.propTypes = {
  closeModal: PropTypes.func,
  onOK: PropTypes.func,
  setHeight: PropTypes.func
};
