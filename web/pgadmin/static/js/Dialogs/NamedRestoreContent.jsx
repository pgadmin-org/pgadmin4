/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useState, useRef, useEffect } from 'react';
import gettext from 'sources/gettext';
import { Box } from '@material-ui/core';
import { DefaultButton, PrimaryButton } from '../components/Buttons';
import CloseIcon from '@material-ui/icons/CloseRounded';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import PropTypes from 'prop-types';
import { useModalStyles } from '../helpers/ModalProvider';
import { InputText } from '../components/FormComponents';
import { isEmptyString } from '../../../static/js/validators';

export default function NamedRestoreContent({closeModal, onOK, setHeight}) {
  const classes = useModalStyles();
  const containerRef = useRef();
  const firstEleRef = useRef();
  const okBtnRef = useRef();
  const [formData, setFormData] = useState({
    namedRestorePoint: ''
  });

  const onTextChange = (e, id) => {
    let val = e;
    if(e && e.target) {
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
      firstEleRef.current && firstEleRef.current.focus();
    }, 275);
  }, []);

  useEffect(()=>{
    setHeight?.(containerRef.current?.offsetHeight);
  }, [containerRef.current]);

  const isOKDisabled = isEmptyString(formData.namedRestorePoint);

  return (
    <Box display="flex" flexDirection="column" className={classes.container} ref={containerRef}>
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
      <Box className={classes.footer}>
        <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={()=>{
          closeModal();
        }} >{gettext('Cancel')}</DefaultButton>
        <PrimaryButton ref={okBtnRef} data-test="save" disabled={isOKDisabled} className={classes.margin} startIcon={<CheckRoundedIcon />} onClick={()=>{
          let postFormData = new FormData();
          postFormData.append('value', formData.namedRestorePoint);
          onOK?.(postFormData);
          closeModal();
        }} >{gettext('OK')}</PrimaryButton>
      </Box>
    </Box>
  );
}

NamedRestoreContent.propTypes = {
  closeModal: PropTypes.func,
  data: PropTypes.object,
  onOK: PropTypes.func,
  setHeight: PropTypes.func
};
