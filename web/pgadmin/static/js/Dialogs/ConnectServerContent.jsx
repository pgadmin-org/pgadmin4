/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import gettext from 'sources/gettext';
import { Box } from '@mui/material';
import { DefaultButton, PrimaryButton } from '../components/Buttons';
import CloseIcon from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PropTypes from 'prop-types';
import { FormFooterMessage, InputCheckbox, InputText, MESSAGE_TYPE } from '../components/FormComponents';
import { ModalContent, ModalFooter } from '../../../static/js/components/ModalContent';

export default function ConnectServerContent({closeModal, data, onOK, setHeight, hideSavePassword=false}) {

  const containerRef = useRef();
  const firstEleRef = useRef();
  const okBtnRef = useRef();
  const [formData, setFormData] = useState({
    tunnel_password: '',
    save_tunnel_password: false,
    password: '',
    save_password: false,
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


  useLayoutEffect(()=>{
    firstEleRef.current?.focus();
  }, []);

  useEffect(()=>{
    setHeight?.(containerRef.current?.offsetHeight);
  }, [containerRef.current]);

  if(!data) {
    return <>No data</>;
  }

  return (
    <ModalContent ref={containerRef}>
      <Box flexGrow="1" p={2}>
        {data.prompt_tunnel_password && <>
          <Box>
            <span style={{fontWeight: 'bold'}}>
              {data.tunnel_identity_file ?
                gettext('Please enter the SSH Tunnel password for the identity file \'%s\' to connect the server "%s"', data.tunnel_identity_file, data.tunnel_host)
                : gettext('Please enter the SSH Tunnel password for the user \'%s\' to connect the server "%s"', data.tunnel_username, data.tunnel_host)
              }
            </span>
          </Box>
          <Box marginTop='12px'>
            <InputText inputRef={firstEleRef} type="password" value={formData['tunnel_password']} controlProps={{maxLength:null, autoComplete:'new-password'}}
              onChange={(e)=>onTextChange(e, 'tunnel_password')} onKeyDown={(e)=>onKeyDown(e)} />
          </Box>
          <Box marginTop='12px' marginBottom='12px' visibility={hideSavePassword ? 'hidden' : 'unset'}>
            <InputCheckbox controlProps={{label: gettext('Save Password')}} value={formData['save_tunnel_password']}
              onChange={(e)=>onTextChange(e.target.checked, 'save_tunnel_password')} disabled={!data.allow_save_tunnel_password} />
          </Box>
        </>}
        {data.prompt_password && <>
          <Box>
            <span style={{fontWeight: 'bold'}}>
              {data.username ?
                gettext('Please enter the password for the user \'%s\' to connect the server - "%s"', data.username, data.server_label)
                : gettext('Please enter the password for the user to connect the server - "%s"', data.server_label)
              }
            </span>
          </Box>
          <Box marginTop='12px'>
            <InputText inputRef={(ele)=>{
              if(!data.prompt_tunnel_password) {
                /* Set only if no tunnel password asked */
                firstEleRef.current = ele;
              }
            }} type="password" value={formData['password']} controlProps={{maxLength:null}}
            onChange={(e)=>onTextChange(e, 'password')} onKeyDown={(e)=>onKeyDown(e)}/>
          </Box>
          <Box marginTop='12px' visibility={hideSavePassword ? 'hidden' : 'unset'}>
            <InputCheckbox controlProps={{label: gettext('Save Password')}} value={formData['save_password']}
              onChange={(e)=>onTextChange(e.target.checked, 'save_password')} disabled={!data.allow_save_password} />
          </Box>
        </>}
        <FormFooterMessage type={MESSAGE_TYPE.ERROR} message={_.escape(data.errmsg)} closable={false} style={{
          position: 'unset', padding: '12px 0px 0px'
        }}/>
      </Box>
      <ModalFooter>
        <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={()=>{
          closeModal();
        }} >{gettext('Cancel')}</DefaultButton>
        <PrimaryButton ref={okBtnRef} data-test="save" startIcon={<CheckRoundedIcon />} onClick={()=>{
          let postFormData = new FormData();
          if(data.prompt_tunnel_password) {
            postFormData.append('tunnel_password', formData.tunnel_password);
            formData.save_tunnel_password &&
              postFormData.append('save_tunnel_password', formData.save_tunnel_password);
          }
          if(data.prompt_password) {
            postFormData.append('password', formData.password);
            formData.save_password &&
              postFormData.append('save_password', formData.save_password);
          }
          onOK?.(postFormData);
          closeModal();
        }} >{gettext('OK')}</PrimaryButton>
      </ModalFooter>
    </ModalContent>
  );
}

ConnectServerContent.propTypes = {
  closeModal: PropTypes.func,
  data: PropTypes.object,
  onOK: PropTypes.func,
  setHeight: PropTypes.func,
  hideSavePassword: PropTypes.bool
};
