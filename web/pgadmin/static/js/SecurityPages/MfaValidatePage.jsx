import React, { useState } from 'react';
import LoginImage from '../../img/login.svg?svgr';
import { InputSelect, InputText, MESSAGE_TYPE, NotifierMessage } from '../components/FormComponents';
import BasePage, { SecurityButton } from './BasePage';
import { useDelayedCaller } from '../custom_hooks';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';

function EmailValidateView({mfaView, sendEmailUrl, csrfHeader, csrfToken}) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const showResendAfter = useDelayedCaller(()=>{
    setShowResend(true);
  });

  const sendCodeToEmail = ()=>{
    setSending(true);
    let accept = 'text/html; charset=utf-8;';

    fetch(sendEmailUrl, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': accept,
        'Content-Type': 'application/json; charset=utf-8;',
        [csrfHeader]: csrfToken,
      },
      redirect: 'follow'
    }).then((resp) => {
      if (!resp.ok) {
        resp.text().then(msg => setError(msg));
        return;
      }
      return resp.json();
    }).then((resp) => {
      if (!resp)
        return;
      setSentMessage(resp.message);
      showResendAfter(20000);
    }).finally(()=>{
      setSending(false);
    });
  };

  return <>
    <div style={{textAlign: 'center'}}>{mfaView.description}</div>
    {sentMessage && <>
      <div>{sentMessage}</div>
      {showResend && <div>
        <span>{gettext('Haven\'t received an email?')} <a style={{color:'inherit', fontWeight: 'bold'}} href="#" onClick={sendCodeToEmail}>{gettext('Send again')}</a></span>
      </div>}
      <InputText value={inputValue} type="password" name="code" placeholder={mfaView.otp_placeholder}
        onChange={setInputValue} autoFocus
      />
      <SecurityButton value='Validate'>{gettext('Validate')}</SecurityButton>
    </>}
    {error && <NotifierMessage message={error} type={MESSAGE_TYPE.ERROR} closable={false} />}
    {!sentMessage &&
    <SecurityButton type="button" name="send_code" onClick={sendCodeToEmail} disabled={sending}>
      {sending ? mfaView.button_label_sending : mfaView.button_label}
    </SecurityButton>}
  </>;
}

EmailValidateView.propTypes = {
  mfaView: PropTypes.object,
  sendEmailUrl: PropTypes.string,
  csrfHeader: PropTypes.string,
  csrfToken: PropTypes.string
};

function AuthenticatorValidateView({mfaView}) {
  const [inputValue, setInputValue] = useState('');

  return <>
    <div>{mfaView.auth_description}</div>
    <InputText value={inputValue} type="password" name="code" placeholder={mfaView.otp_placeholder}
      onChange={setInputValue} autoFocus
    />
    <SecurityButton value='Validate'>{gettext('Validate')}</SecurityButton>
  </>;
}

AuthenticatorValidateView.propTypes = {
  mfaView: PropTypes.object,
};

export default function MfaValidatePage({actionUrl, views, logoutUrl, sendEmailUrl, csrfHeader, csrfToken, ...props}) {
  const [method, setMethod] = useState(Object.values(views).find((v)=>v.selected)?.id);
  return (
    <>
      <BasePage title={gettext('Authentication')} pageImage={<LoginImage style={{height: '100%', width: '100%'}} />} {...props}>
        <form style={{display:'flex', gap:'15px', flexDirection:'column', minHeight: 0}} action={actionUrl} method="POST">
          <InputSelect value={method} options={Object.keys(views).map((k)=>({
            label: views[k].label,
            value: views[k].id,
            imageUrl: views[k].icon
          }))} onChange={setMethod} controlProps={{
            allowClear: false,
          }} />
          <div><input type='hidden' name='mfa_method' defaultValue={method} /></div>
          {method == 'email' && <EmailValidateView mfaView={views[method].view} sendEmailUrl={sendEmailUrl} csrfHeader={csrfHeader} csrfToken={csrfToken} />}
          {method == 'authenticator' && <AuthenticatorValidateView mfaView={views[method].view} />}
          <div style={{textAlign: 'right'}}>
            <a style={{color:'inherit'}} href={logoutUrl}>{gettext('Logout')}</a>
          </div>
        </form>
      </BasePage>
    </>
  );
}

MfaValidatePage.propTypes = {
  actionUrl: PropTypes.string,
  views: PropTypes.object,
  logoutUrl: PropTypes.string,
  sendEmailUrl: PropTypes.string,
  csrfHeader: PropTypes.string,
  csrfToken: PropTypes.string
};
