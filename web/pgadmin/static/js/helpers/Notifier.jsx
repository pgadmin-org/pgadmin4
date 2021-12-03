/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useSnackbar, SnackbarProvider, SnackbarContent } from 'notistack';
import React from 'react';
import ReactDOM from 'react-dom';
import Theme from 'sources/Theme';
import { NotifierMessage, MESSAGE_TYPE } from '../components/FormComponents';
import CustomPropTypes from '../custom_prop_types';
import gettext from 'sources/gettext';
import pgWindow from 'sources/window';
import Alertify from 'pgadmin.alertifyjs';
import ModalProvider, { useModal } from './ModalProvider';
import { DefaultButton, PrimaryButton } from '../components/Buttons';
import { Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import HTMLReactParse from 'html-react-parser';
import CloseIcon from '@material-ui/icons/CloseRounded';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import PropTypes from 'prop-types';

const AUTO_HIDE_DURATION = 3000;  // In milliseconds

let snackbarRef;
let notifierInitialized = false;
export function initializeNotifier(notifierContainer) {
  notifierInitialized = true;
  const RefLoad = ()=>{
    snackbarRef = useSnackbar();
    return <></>;
  };
  ReactDOM.render(
    <Theme>
      <SnackbarProvider
        maxSnack={30}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
        <RefLoad />
      </SnackbarProvider>
    </Theme>, notifierContainer
  );
}

let modalRef;
let modalInitialized = false;
export function initializeModalProvider(modalContainer) {
  modalInitialized = true;
  const RefLoad = ()=>{
    modalRef = useModal();
    return <></>;
  };
  ReactDOM.render(
    <Theme>
      <ModalProvider>
        <RefLoad />
      </ModalProvider>
    </Theme>, modalContainer
  );
}

const FinalNotifyContent = React.forwardRef(({children}, ref) => {
  return <SnackbarContent style= {{justifyContent:'end'}} ref={ref}>{children}</SnackbarContent>;
});
FinalNotifyContent.displayName = 'FinalNotifyContent';
FinalNotifyContent.propTypes = {
  children: CustomPropTypes.children,
};

const useAlertStyles = makeStyles((theme)=>({
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0.5rem',
    ...theme.mixins.panelBorder.top,
  },
  margin: {
    marginLeft: '0.25rem',
  }
}));
function AlertContent({text, confirm, onOkClick, onCancelClick}) {
  const classes = useAlertStyles();
  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box flexGrow="1" p={2}>{HTMLReactParse(text)}</Box>
      <Box className={classes.footer}>
        <DefaultButton startIcon={<CloseIcon />} onClick={onCancelClick} autoFocus={!confirm}>Close</DefaultButton>
        {confirm &&
          <PrimaryButton className={classes.margin} startIcon={<CheckRoundedIcon />} onClick={onOkClick} autoFocus={confirm}>OK</PrimaryButton>
        }
      </Box>
    </Box>
  );
}
AlertContent.propTypes = {
  text: PropTypes.string,
  confirm: PropTypes.bool,
  onOkClick: PropTypes.func,
  onCancelClick: PropTypes.func,
};

var Notifier = {
  success(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this._callNotify(msg, MESSAGE_TYPE.SUCCESS, autoHideDuration);
  },
  warning(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this._callNotify(msg, MESSAGE_TYPE.WARNING, autoHideDuration);
  },
  info(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this._callNotify(msg, MESSAGE_TYPE.INFO, autoHideDuration);
  },
  error(msg, autoHideDuration = AUTO_HIDE_DURATION) {
    this._callNotify(msg, MESSAGE_TYPE.ERROR, autoHideDuration);
  },
  notify(content, autoHideDuration) {
    if (content) {
      if(!notifierInitialized) {
        initializeNotifier(document.getElementById('notifierContainer'));
      }
      let  options = {autoHideDuration, content:(key) => (
        <FinalNotifyContent>{React.cloneElement(content, {onClose:()=>{snackbarRef.closeSnackbar(key);}})}</FinalNotifyContent>
      )};
      options.content.displayName = 'content';
      snackbarRef.enqueueSnackbar(null, options);
    }
  },
  _callNotify(msg, type, autoHideDuration) {
    if (!_.isNull(autoHideDuration)) {
      this.notify(<NotifierMessage type={type} message={msg} closable={false} />, autoHideDuration);
    } else {
      this.notify(<NotifierMessage type={type} message={msg}/>, null);
    }
  },

  pgRespErrorNotify(xhr, error, prefixMsg='') {
    var contentType = xhr.getResponseHeader('Content-Type');
    if (xhr.status === 410) {
      const pgBrowser = window.pgAdmin.Browser;
      pgBrowser.report_error(gettext('Error: Object not found - %s.', xhr.statusText), xhr.responseJSON.errormsg);
    } else {
      try {
        if (xhr.status === 0) {
          error = gettext('Connection to the server has been lost.');
        } else {
          if(contentType){
            if(contentType.indexOf('application/json') >= 0) {
              var resp = JSON.parse(xhr.responseText);
              error = _.escape(resp.result) || _.escape(resp.errormsg) || gettext('Unknown error');
            }
          }
          if (contentType.indexOf('text/html') >= 0) {
            error = gettext('INTERNAL SERVER ERROR');
            console.warn(xhr.responseText);
          }
        }
      }
      catch(e){
        error = e.message;
      }

      this.error(prefixMsg + ' ' + error);
    }
  },

  pgNotifier(type, xhr, promptmsg, onJSONResult) {
    var msg = xhr.responseText,
      contentType = xhr.getResponseHeader('Content-Type');

    if (xhr.status == 0) {
      msg = gettext('Connection to the server has been lost.');
      promptmsg = gettext('Connection Lost');
    } else {
      if (contentType) {
        try {
          if (contentType.indexOf('application/json') == 0) {
            var resp = JSON.parse(msg);

            if(resp.info == 'CRYPTKEY_MISSING') {
              var pgBrowser = window.pgAdmin.Browser;
              pgBrowser.set_master_password('', ()=> {
                if(onJSONResult && typeof(onJSONResult) == 'function') {
                  onJSONResult('CRYPTKEY_SET');
                }
              });
              return;
            } else if (resp.result != null && (!resp.errormsg || resp.errormsg == '') &&
              onJSONResult && typeof(onJSONResult) == 'function') {
              return onJSONResult(resp.result);
            }
            msg = _.escape(resp.result) || _.escape(resp.errormsg) || 'Unknown error';
          }
          if (contentType.indexOf('text/html') == 0) {
            var alertMessage = promptmsg;
            if (type === 'error') {
              alertMessage =
                  '<div class="media text-danger text-14">'
                  +  '<div class="media-body media-middle">'
                  +    '<div class="alert-text" role="alert">' + promptmsg + '</div><br/>'
                  +    '<div class="alert-text" role="alert">' + gettext('Click for details.') + '</div>'
                  +  '</div>'
                  + '</div>';
            }

            Alertify.notify(
              alertMessage, type, 0,
              function() {
                Alertify.pgIframeDialog().show().set({
                  frameless: false,
                }).set(
                  'pg_msg', msg
                );
              });
            return;
          }
        } catch (e) {
          Alertify.alert().show().set('message', e.message).set(
            'title', 'Error'
          ).set('closable', true);
        }
      }
    }
    Alertify.alert().show().set(
      'message', msg.replace(new RegExp(/\r?\n/, 'g'), '<br />')
    ).set('title', promptmsg).set('closable', true);
  },
  alert: (title, text, onCancelClick)=>{
    if(!modalInitialized) {
      initializeModalProvider(document.getElementById('modalContainer'));
    }
    modalRef.showModal(title, (closeModal)=>{
      const onCancelClickClose = ()=>{
        onCancelClick && onCancelClick();
        closeModal();
      };
      return (
        <AlertContent text={text} onCancelClick={onCancelClickClose} />
      );
    });
  },
  confirm: (title, text, onOkClick, onCancelClick)=>{
    if(!modalInitialized) {
      initializeModalProvider(document.getElementById('modalContainer'));
    }
    modalRef.showModal(title, (closeModal)=>{
      const onCancelClickClose = ()=>{
        onCancelClick && onCancelClick();
        closeModal();
      };
      const onOkClickClose = ()=>{
        onOkClick && onOkClick();
        closeModal();
      };
      return (
        <AlertContent text={text} confirm onOkClick={onOkClickClose} onCancelClick={onCancelClickClose} />
      );
    });
  },
};

if(window.frameElement) {
  Notifier = pgWindow.Notifier;
} else {
  pgWindow.Notifier = Notifier;
}
export default Notifier;
