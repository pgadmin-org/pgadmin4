import React, { useState } from 'react';
import ForgotPasswordImage from '../../img/forgot_password.svg?svgr';
import { InputText } from '../components/FormComponents';
import BasePage, { SecurityButton } from './BasePage';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';

export default function PasswordResetPage({csrfToken, actionUrl, ...props}) {
  const [form, setForm] = useState(({password: '', password_confirm: ''}));

  const onTextChange = (n, val)=>{
    setForm((prev)=>({...prev, [n]: val}));
  };

  return (
    <BasePage title={gettext('Reset Password')} pageImage={<ForgotPasswordImage style={{height: '100%', width: '100%'}} />} {...props} >
      <form style={{display:'flex', gap:'15px', flexDirection:'column'}} action={actionUrl} method="POST">
        <input name="csrf_token" defaultValue={csrfToken} hidden/>
        <InputText name="password" value={form.password} onChange={(v)=>onTextChange('password', v)} type="password" placeholder={gettext('Password')} autoFocus/>
        <InputText name="password_confirm" value={form.password_confirm} onChange={(v)=>onTextChange('password_confirm', v)} type="password" placeholder={gettext('Retype Password')} />
        <SecurityButton value="Reset Password">{gettext('Reset Password')}</SecurityButton>
      </form>
    </BasePage>
  );
}

PasswordResetPage.propTypes = {
  csrfToken: PropTypes.string,
  actionUrl: PropTypes.string
};
