import ReactDOM from 'react-dom/client';
import React from 'react';
import { SnackbarProvider } from 'notistack';
import Theme from '../Theme/index';
import LoginPage from './LoginPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import PasswordResetPage from './PasswordResetPage';
import MfaRegisterPage from './MfaRegisterPage';
import MfaValidatePage from './MfaValidatePage';

window.renderSecurityPage = function(pageName, pageProps, otherProps) {
  let ComponentPageMap = {
    'login_user': LoginPage,
    'forgot_password': ForgotPasswordPage,
    'reset_password': PasswordResetPage,
    'mfa_register': MfaRegisterPage,
    'mfa_validate': MfaValidatePage,
  };

  const Page = ComponentPageMap[pageName];
  const root = ReactDOM.createRoot(document.querySelector('#root'));

  if(Page) {
    root.render(<Theme>
      <SnackbarProvider
        maxSnack={5}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}>
        <Page {...pageProps} {...otherProps} />
      </SnackbarProvider>
    </Theme>);
  } else {
    root.render(
      <h1>Invalid Page</h1>);
  }
};
