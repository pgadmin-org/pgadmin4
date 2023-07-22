/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useSnackbar, SnackbarProvider, SnackbarContent } from 'notistack';
import { makeStyles } from '@material-ui/core/styles';
import {Box} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/CloseRounded';
import { DefaultButton, PrimaryButton } from '../components/Buttons';
import HTMLReactParser from 'html-react-parser';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import Theme from 'sources/Theme';
import { NotifierMessage, MESSAGE_TYPE } from '../components/FormComponents';
import CustomPropTypes from '../custom_prop_types';
import gettext from 'sources/gettext';
import _ from 'lodash';
import pgWindow from 'sources/window';
import ModalProvider, { useModal } from './ModalProvider';
import { parseApiError } from '../api_instance';

const AUTO_HIDE_DURATION = 3000;  // In milliseconds

let snackbarRef;
let notifierInitialized = false;
export function initializeNotifier(notifierContainer) {
  notifierInitialized = true;
  const RefLoad = ()=>{
    snackbarRef = useSnackbar();
    return <></>;
  };

  if (!notifierContainer) {
    notifierContainer = document.createElement('div');
    document.body.appendChild(notifierContainer);
  }

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

  if (!modalContainer) {
    modalContainer = document.createElement('div');
    document.body.appendChild(modalContainer);
  }

  ReactDOM.render(
    <Theme>
      <ModalProvider>
        <RefLoad />
      </ModalProvider>
    </Theme>, modalContainer
  );
}

export const FinalNotifyContent = React.forwardRef(({children}, ref) => {
  return <SnackbarContent style= {{justifyContent:'end', maxWidth: '700px'}} ref={ref}>{children}</SnackbarContent>;
});
FinalNotifyContent.displayName = 'FinalNotifyContent';
FinalNotifyContent.propTypes = {
  children: CustomPropTypes.children,
};

const useModalStyles = makeStyles((theme)=>({
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0.5rem',
    ...theme.mixins.panelBorder.top,
  },
  margin: {
    marginLeft: '0.25rem',
  },
}));
function AlertContent({text, confirm, okLabel=gettext('OK'), cancelLabel=gettext('Cancel'), onOkClick, onCancelClick}) {
  const classes = useModalStyles();
  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box flexGrow="1" p={2}>{HTMLReactParser(text)}</Box>
      <Box className={classes.footer}>
        {confirm &&
          <DefaultButton startIcon={<CloseIcon />} onClick={onCancelClick} >{cancelLabel}</DefaultButton>
        }
        <PrimaryButton className={classes.margin} startIcon={<CheckRoundedIcon />} onClick={onOkClick} autoFocus={true} >{okLabel}</PrimaryButton>
      </Box>
    </Box>
  );
}
AlertContent.propTypes = {
  text: PropTypes.string,
  confirm: PropTypes.bool,
  onOkClick: PropTypes.func,
  onCancelClick: PropTypes.func,
  okLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
};


let Notifier = {
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
        initializeNotifier();
      }
      let  options = {autoHideDuration, content:(key) => (
        <FinalNotifyContent>{React.cloneElement(content, {onClose:()=>{snackbarRef.closeSnackbar(key);}})}</FinalNotifyContent>
      )};
      options.content.displayName = 'content';
      snackbarRef.enqueueSnackbar(null, options);
    }
  },
  _callNotify(msg, type, autoHideDuration) {
    this.notify(
      <NotifierMessage style={{maxWidth: '50vw'}} type={type} message={msg} closable={true} />,
      autoHideDuration
    );
  },

  pgRespErrorNotify(error, prefixMsg='') {
    if (error.response?.status === 410) {
      this.alert(gettext('Error: Object not found - %s.', error.response.statusText), parseApiError(error));
    } else {
      this.error(prefixMsg + ' ' + parseApiError(error));
    }
  },

  pgNotifier(type, error, promptmsg, onJSONResult) {
    let msg;

    if(!error.response) {
      msg = parseApiError(error);
      promptmsg = gettext('Connection Lost');
    } else {
      if(error.response.headers['content-type'] == 'application/json') {
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
        msg = _.escape(resp.result) || _.escape(resp.errormsg) || 'Unknown error';
      } else {
        if (type === 'error') {
          this.alert('Error', promptmsg);
        }
        return;
      }
    }
    if(type == 'error-noalert' && onJSONResult && typeof(onJSONResult) == 'function') {
      return onJSONResult();
    }
    this.alert(promptmsg, msg.replace(new RegExp(/\r?\n/, 'g'), '<br />'));
  },
  alert: (title, text, onOkClick, okLabel=gettext('OK'))=>{
    /* Use this if you want to use pgAdmin global notifier.
    Or else, if you want to use modal inside iframe only then use ModalProvider eg- query tool */
    if(!modalInitialized) {
      initializeModalProvider();
    }
    modalRef.alert(title, text, onOkClick, okLabel);
  },
  confirm: (title, text, onOkClick, onCancelClick, okLabel=gettext('Yes'), cancelLabel=gettext('No'))=>{
    /* Use this if you want to use pgAdmin global notifier.
    Or else, if you want to use modal inside iframe only then use ModalProvider eg- query tool */
    if(!modalInitialized) {
      initializeModalProvider();
    }
    modalRef.confirm(title, text, onOkClick, onCancelClick, okLabel, cancelLabel);
  },
  showModal: (title, content, modalOptions) => {
    if(!modalInitialized) {
      initializeModalProvider();
    }
    modalRef.showModal(title, content, modalOptions);
  }
};

if(window.frameElement) {
  Notifier = pgWindow.Notifier || Notifier;
} else if(!pgWindow.Notifier){
  pgWindow.Notifier = Notifier;
}
export default Notifier;
