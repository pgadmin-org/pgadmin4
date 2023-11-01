/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';

import { Box } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/CloseRounded';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import HelpIcon from '@material-ui/icons/Help';

import { DefaultButton, PrimaryButton, PgIconButton } from '../components/Buttons';
import { useModalStyles } from '../helpers/ModalProvider';
import { FormFooterMessage, FormNote, InputText, MESSAGE_TYPE } from '../components/FormComponents';

export default function MasterPasswordContent({ closeModal, onResetPassowrd, onOK, onCancel, setHeight, isPWDPresent, data, keyringName}) {
  const classes = useModalStyles();
  const containerRef = useRef();
  const firstEleRef = useRef();
  const okBtnRef = useRef();
  const isKeyring = keyringName.length > 0;
  const [formData, setFormData] = useState({
    password: ''
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

  useEffect(() => {
    setTimeout(() => {
      firstEleRef.current && firstEleRef.current.focus();
    }, 350);
  }, [firstEleRef.current]);

  useEffect(() => {
    setHeight?.(containerRef.current?.offsetHeight);
  }, [containerRef.current]);


  return (
    <Box display="flex" flexDirection="column" className={classes.container} ref={containerRef}>
      {isKeyring ?
        <Box flexGrow="1" p={2}>
          <Box>
            <span style={{ fontWeight: 'bold' }}>
              {gettext('Please enter your master password.')}
            </span>
            <br />
            <span style={{ fontWeight: 'bold' }}>
              <FormNote text={gettext(`pgAdmin now stores any saved passwords in ${keyringName}. Enter the master password for your existing pgAdmin saved passwords and they will be migrated to the operating system store when you click OK.`)}></FormNote>
            </span>
          </Box>
          <Box marginTop='12px'>
            <InputText inputRef={firstEleRef} type="password" value={formData['password']} maxLength={null}
              onChange={(e) => onTextChange(e, 'password')} onKeyDown={(e) => onKeyDown(e)}/>
          </Box>
          <FormFooterMessage type={MESSAGE_TYPE.ERROR} message={data.errmsg} closable={false} style={{
            position: 'unset', padding: '12px 0px 0px'
          }} />
        </Box> :
        <Box flexGrow="1" p={2}>
          <Box>
            <span style={{ fontWeight: 'bold' }}>
              {isPWDPresent ? gettext('Please enter your master password.') : gettext('Please set a master password for pgAdmin.')}
            </span>
            <br />
            <span style={{ fontWeight: 'bold' }}>
              {isPWDPresent ? gettext('This is required to unlock saved passwords and reconnect to the database server(s).') : gettext('This will be used to secure and later unlock saved passwords and other credentials.')}
            </span>
          </Box>
          <Box marginTop='12px'>
            <InputText inputRef={firstEleRef} type="password" value={formData['password']} maxLength={null}
              onChange={(e) => onTextChange(e, 'password')} onKeyDown={(e) => onKeyDown(e)}/>
          </Box>
          <FormFooterMessage type={MESSAGE_TYPE.ERROR} message={data.errmsg} closable={false} style={{
            position: 'unset', padding: '12px 0px 0px'
          }} />
        </Box>
      }
      <Box className={classes.footer}>
        <Box style={{ marginRight: 'auto' }}>
          <PgIconButton data-test="help-masterpassword" title={gettext('Help')} style={{ padding: '0.3rem', paddingLeft: '0.7rem' }} startIcon={<HelpIcon />} onClick={() => {
            let _url = url_for('help.static', {
              'filename': 'master_password.html',
            });
            window.open(_url, 'pgadmin_help');
          }} >
          </PgIconButton>
          {isPWDPresent &&
            <DefaultButton data-test="reset-masterpassword" style={{ marginLeft: '0.5rem' }} startIcon={<DeleteForeverIcon />}
              onClick={() => {onResetPassowrd?.(isKeyring);}} >
              {gettext('Reset Master Password')}
            </DefaultButton>
          }
        </Box>
        {
          !isKeyring && <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={() => {
            onCancel?.();
            closeModal();
          }} >{gettext('Cancel')}</DefaultButton>
        }
        <PrimaryButton ref={okBtnRef} data-test="save" className={classes.margin} startIcon={<CheckRoundedIcon />}
          disabled={formData.password.length == 0}
          onClick={() => {
            let postFormData = new FormData();
            postFormData.append('password', formData.password);
            postFormData.append('submit_password', true);
            onOK?.(postFormData);
            closeModal();
          }}
        >
          {gettext('OK')}
        </PrimaryButton>
      </Box>
    </Box>);
}

MasterPasswordContent.propTypes = {
  closeModal: PropTypes.func,
  onResetPassowrd: PropTypes.func,
  onOK: PropTypes.func,
  onCancel: PropTypes.func,
  setHeight: PropTypes.func,
  isPWDPresent: PropTypes.bool,
  data: PropTypes.object,
  keyringName: PropTypes.string,
};
