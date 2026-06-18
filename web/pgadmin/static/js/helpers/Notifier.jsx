/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { SnackbarProvider, SnackbarContent } from 'notistack';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import { NotifierMessage, MESSAGE_TYPE } from '../components/FormComponents';
import CustomPropTypes from '../custom_prop_types';
import gettext from 'sources/gettext';
import { useModal } from './ModalProvider';
import { parseApiError } from '../api_instance';


const Root = styled('div')(({theme}) => ({
  '& .Notifier-footer': {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0.5rem',
    ...theme.mixins.panelBorder.top,
    '& .Notifier-margin': {
      marginLeft: '0.25rem',
    }
  },
}));

const AUTO_HIDE_DURATION = 3000;  // In milliseconds

export function FinalNotifyContent(
  {
    ref,
    children
  }
) {
  return <SnackbarContent style= {{ justifyContent: 'end', maxWidth: '700px' }} ref={ref}>{children}</SnackbarContent>;
};
FinalNotifyContent.displayName = 'FinalNotifyContent';
FinalNotifyContent.propTypes = {
  children: CustomPropTypes.children,
};

// This can be called from iframe,
// so need to separate the context to avoid hooks error
class SnackbarNotifier {
  constructor(snackbar) {
    this.snackbarObj = snackbar;
  }

  notify(content, autoHideDuration) {
    if (content) {
      let options = {autoHideDuration, content:(key) => (
        <FinalNotifyContent>{React.cloneElement(content, {onClose:()=>{this.snackbarObj.closeSnackbar(key);}})}</FinalNotifyContent>
      )};
      options.content.displayName = 'content';
      this.snackbarObj.enqueueSnackbar(options);
    }
  }

  callNotify(msg, type, autoHideDuration, {plainText = false} = {}) {
    this.notify(
      <NotifierMessage style={{maxWidth: '50vw'}} type={type} message={msg} closable={true} plainText={plainText} />,
      autoHideDuration
    );
  }
}

class Notifier {
  constructor(modal, snackbar) {
    this.modal = modal;
    this.snackbar = snackbar;
  }

  success(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this.snackbar.callNotify(msg, MESSAGE_TYPE.SUCCESS, autoHideDuration);
  }

  warning(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this.snackbar.callNotify(msg, MESSAGE_TYPE.WARNING, autoHideDuration);
  }

  info(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this.snackbar.callNotify(msg, MESSAGE_TYPE.INFO, autoHideDuration);
  }

  error(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this.snackbar.callNotify(msg, MESSAGE_TYPE.ERROR, autoHideDuration);
  }

  // Plain-text snackbar variants. Use these when `msg` is, or may contain,
  // text from an untrusted source (PostgreSQL server, driver, remote API,
  // user input). Newlines are preserved; no HTML is interpreted.
  successText(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this.snackbar.callNotify(msg, MESSAGE_TYPE.SUCCESS, autoHideDuration, {plainText: true});
  }
  warningText(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this.snackbar.callNotify(msg, MESSAGE_TYPE.WARNING, autoHideDuration, {plainText: true});
  }
  infoText(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this.snackbar.callNotify(msg, MESSAGE_TYPE.INFO, autoHideDuration, {plainText: true});
  }
  errorText(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this.snackbar.callNotify(msg, MESSAGE_TYPE.ERROR, autoHideDuration, {plainText: true});
  }

  // proxy
  notify(...args) {
    this.snackbar.notify(...args);
  }

  pgRespErrorNotify(error, prefixMsg='') {
    if (error.response?.status === 410) {
      this.alertText(
        gettext('Error: Object not found - %s.', error.response.statusText),
        parseApiError(error)
      );
    } else {
      this.errorText(prefixMsg + ' ' + parseApiError(error));
    }
  }

  pgNotifier(type, error, promptmsg, onJSONResult) {
    let msg;

    if(!error.response) {
      msg = parseApiError(error);
      promptmsg = gettext('Connection Lost');
    } else if(error.response.headers['content-type'] == 'application/json') {
      let resp = error.response.data;
      if(resp.info == 'CRYPTKEY_MISSING') {
        let pgBrowser = window.pgAdmin.Browser;
        pgBrowser.set_master_password('', ()=> {
          if(onJSONResult && typeof(onJSONResult) == 'function') {
            onJSONResult('CRYPTKEY_SET');
          }
        }, ()=> {
          if(onJSONResult && typeof(onJSONResult) == 'function') {
            onJSONResult('CRYPTKEY_NOT_SET');
          }
        });
        return;
      } else if (resp.result != null && (!resp.errormsg || resp.errormsg == '') &&
        onJSONResult && typeof(onJSONResult) == 'function') {
        return onJSONResult(resp.result);
      }
      msg = resp.result || resp.errormsg || 'Unknown error';
    } else {
      if (type === 'error') {
        this.alertText('Error', promptmsg);
      }
      return;
    }
    if(type == 'error-noalert' && onJSONResult && typeof(onJSONResult) == 'function') {
      return onJSONResult();
    }
    this.alertText(promptmsg, msg);
    onJSONResult?.('ALERT_CALLED');
  }

  alert(title, text, onOkClick, okLabel=gettext('OK')) {
    /* Use this if you want to use pgAdmin global notifier.
    Or else, if you want to use modal inside iframe only then use ModalProvider eg- query tool */
    this.modal.alert(title, text, onOkClick, okLabel);
  }

  // Plain-text modal alert. Use whenever `text` may contain untrusted
  // content (driver / API error messages, server-supplied strings, etc.).
  alertText(title, text, onOkClick, okLabel=gettext('OK')) {
    this.modal.alert(title, text, onOkClick, okLabel, {plainText: true});
  }

  confirm(title, text, onOkClick, onCancelClick, okLabel=gettext('Yes'), cancelLabel=gettext('No'), okIcon='default', modalId=null) {
    /* Use this if you want to use pgAdmin global notifier.
    Or else, if you want to use modal inside iframe only then use ModalProvider eg- query tool */
    this.modal.confirm(title, text, onOkClick, onCancelClick, okLabel, cancelLabel, okIcon, modalId);
  }

  confirmDelete(title, text, onDeleteClick, onCancelClick, okLabel = gettext('Delete'), cancelLabel = gettext('Cancel')){
    this.modal.confirmDelete(title, text, onDeleteClick, onCancelClick, okLabel, cancelLabel);
  }

  showModal(title, content, modalOptions) {
    this.modal.showModal(title, content, modalOptions);
  }
}

export function NotifierProvider({ pgAdmin, pgWindow, getInstance, children, onReady }) {
  const modal = useModal();

  useEffect(()=>{
    // if opened in an iframe then use top pgAdmin
    // pgAdmin itself can open in iframe, skip this in that case.
    if(window.self != window.top && pgWindow != window ) {
      pgAdmin.Browser.notifier = new Notifier(modal, pgWindow.pgAdmin.Browser.notifier.snackbar);
      onReady?.();
      getInstance?.(pgAdmin.Browser.notifier);
    }
  }, []);

  // if open in a window, then create your own Snackbar
  // if pgAdmin is opened inside an iframe then it also same as new window.
  if(window.self == window.top || (window.self != window.top && pgWindow == window )) {
    return (
      <Root>
        <SnackbarProvider
          maxSnack={30}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          ref={(obj)=>{
            pgAdmin.Browser.notifier = new Notifier(modal, new SnackbarNotifier(obj));
            getInstance?.(pgAdmin.Browser.notifier);
            onReady?.();
          }}
          disableWindowBlurListener={true}
        >
          {children}
        </SnackbarProvider>
      </Root>
    );
  }
  return (
    (<Root>
      {children}
    </Root>)
  );
}

NotifierProvider.propTypes = {
  pgAdmin: PropTypes.object,
  pgWindow: PropTypes.object,
  getInstance: PropTypes.func,
  children: CustomPropTypes.children,
  onReady: PropTypes.func,
};

export default Notifier;
