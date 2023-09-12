import { Box, Icon } from '@material-ui/core';
import React, { useState } from 'react';
import LoginImage from '../../img/login.svg?svgr';
import { InputSelectNonSearch, InputText, MESSAGE_TYPE, NotifierMessage } from '../components/FormComponents';
import BasePage, { SecurityButton } from './BasePage';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';

export default function LoginPage({userLanguage, langOptions, forgotPassUrl, csrfToken, loginUrl, authSources, authSourcesEnum, oauth2Config, loginBanner, ...props}) {
  const [form, setForm] = useState(({email: '', password: '', language: userLanguage}));

  // Hide login form if auth source is only oauth2 and/or kerberos. #5386
  const showLoginForm = !((authSources?.includes('oauth2') || authSources?.includes('kerberos')) && authSources?.length == 1 || (authSources?.includes('oauth2') 
  && authSources?.includes('kerberos')) && authSources?.length == 2);

  const onTextChange = (n, val)=>{
    setForm((prev)=>({...prev, [n]: val}));
  };

  return (
    <>
      {loginBanner && <NotifierMessage showIcon={false} closable={false} type={MESSAGE_TYPE.ERROR} message={loginBanner} style={{
        position: 'absolute',
        width: '80%',
        top: '30px',
        left: 0,
        right: 0,
        marginRight: 'auto',
        marginLeft: 'auto'
      }} textCenter />}
      <BasePage title={gettext('Login')} pageImage={<LoginImage style={{height: '100%', width: '100%'}} />} {...props}>
        <form style={{display:'flex', gap:'15px', flexDirection:'column'}} action={loginUrl} method="POST">
          {showLoginForm &&
          <>
            <input name="csrf_token" defaultValue={csrfToken} hidden/>
            <InputText name="email" value={form.email} onChange={(v)=>onTextChange('email', v)} placeholder={gettext('Email Address / Username')} autoFocus />
            <InputText name="password" value={form.password} onChange={(v)=>onTextChange('password', v)} type="password" placeholder={gettext('Password')} />
            <Box textAlign="right" marginTop="-10px">
              <a style={{color: 'inherit'}} href={forgotPassUrl}>{gettext('Forgotten your password?')}</a>
            </Box>
            <InputSelectNonSearch name="language" options={langOptions} value={form.language} onChange={(v)=>onTextChange('language', v.target.value)} />
            <SecurityButton name="internal_button" value="Login" disabled={!(form.email && form.password)}>{gettext('Login')}</SecurityButton>
          </>
          }
          {authSources?.includes?.(authSourcesEnum.OAUTH2) &&
          oauth2Config.map((oauth)=>{
            return (
              <SecurityButton key={oauth.OAUTH2_NAME} name="oauth2_button" value={oauth.OAUTH2_NAME} style={{backgroundColor: oauth.OAUTH2_BUTTON_COLOR}}>
                <Icon className={'fab '+oauth.OAUTH2_ICON} style={{ fontSize: '1.5em', marginRight: '8px' }} />{gettext('Login with %s', oauth.OAUTH2_DISPLAY_NAME)}
              </SecurityButton>
            );
          })
          }
        </form>
      </BasePage>
    </>
  );
}

LoginPage.propTypes = {
  userLanguage: PropTypes.string,
  langOptions: PropTypes.arrayOf(PropTypes.object),
  forgotPassUrl: PropTypes.string,
  csrfToken: PropTypes.string,
  loginUrl: PropTypes.string,
  authSources: PropTypes.arrayOf(PropTypes.string),
  authSourcesEnum: PropTypes.object,
  oauth2Config: PropTypes.arrayOf(PropTypes.object),
  loginBanner: PropTypes.string
};
