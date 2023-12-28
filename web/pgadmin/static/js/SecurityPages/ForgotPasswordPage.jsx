import React, { useState } from 'react';
import ForgotPasswordImage from '../../img/forgot_password.svg?svgr';
import { InputText } from '../components/FormComponents';
import BasePage, { SecurityButton } from './BasePage';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';

export default function ForgotPasswordPage({csrfToken, actionUrl, ...props}) {
  const [form, setForm] = useState(({email: ''}));

  const onTextChange = (n, val)=>{
    setForm((prev)=>({...prev, [n]: val}));
  };

  return (
    <BasePage title={gettext('Forget Password')} pageImage={<ForgotPasswordImage style={{height: '100%', width: '100%'}} />} {...props} >
      <form style={{display:'flex', gap:'15px', flexDirection:'column'}} action={actionUrl} method="POST">
        <input name="csrf_token" defaultValue={csrfToken} hidden/>
        <div>{gettext('Enter the email address for the user account you wish to recover the password for:')}</div>
        <InputText name="email" value={form.email} onChange={(v)=>onTextChange('email', v)} placeholder={gettext('Email Address')} autoFocus
          controlProps={{autoComplete: null}} />
        <SecurityButton name="internal_button" value="Recover Password">{gettext('Recover Password')}</SecurityButton>
      </form>
    </BasePage>
  );
}

ForgotPasswordPage.propTypes = {
  csrfToken: PropTypes.string,
  actionUrl: PropTypes.string,
};
