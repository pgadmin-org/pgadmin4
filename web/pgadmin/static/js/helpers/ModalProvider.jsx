/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Box, Dialog, DialogContent, DialogTitle, makeStyles, Paper } from '@material-ui/core';
import React from 'react';
import {getEpoch} from 'sources/utils';
import { DefaultButton, PgIconButton, PrimaryButton } from '../components/Buttons';
import Draggable from 'react-draggable';
import CloseIcon from '@material-ui/icons/CloseRounded';
import CustomPropTypes from '../custom_prop_types';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import Theme from '../Theme';
import HTMLReactParser from 'html-react-parser';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';

const ModalContext = React.createContext({});

export function useModal() {
  return React.useContext(ModalContext);
}
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

function AlertContent({text, confirm, okLabel=gettext('OK'), cancelLabel=gettext('Cancel'), onOkClick, onCancelClick}) {
  const classes = useAlertStyles();
  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box flexGrow="1" p={2}>{typeof(text) == 'string' ? HTMLReactParser(text) : text}</Box>
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

function alert(title, text, onOkClick, okLabel=gettext('OK')){
  // bind the modal provider before calling
  this.showModal(title, (closeModal)=>{
    const onOkClickClose = ()=>{
      onOkClick && onOkClick();
      closeModal();
    };
    return (
      <AlertContent text={text} onOkClick={onOkClickClose} okLabel={okLabel} />
    );
  });
}

function confirm(title, text, onOkClick, onCancelClick, okLabel=gettext('Yes'), cancelLabel=gettext('No')) {
  // bind the modal provider before calling
  this.showModal(title, (closeModal)=>{
    const onCancelClickClose = ()=>{
      onCancelClick && onCancelClick();
      closeModal();
    };
    const onOkClickClose = ()=>{
      onOkClick && onOkClick();
      closeModal();
    };
    return (
      <AlertContent text={text} confirm onOkClick={onOkClickClose} onCancelClick={onCancelClickClose} okLabel={okLabel} cancelLabel={cancelLabel}/>
    );
  });
}

export default function ModalProvider({children}) {
  const [modals, setModals] = React.useState([]);

  const showModal = (title, content, modalOptions)=>{
    let id = getEpoch().toString() + Math.random();
    setModals((prev)=>[...prev, {
      id: id,
      title: title,
      content: content,
      ...modalOptions,
    }]);
  };
  const closeModal = (id)=>{
    setModals((prev)=>{
      return prev.filter((o)=>o.id!=id);
    });
  };
  const modalContextBase = {
    showModal: showModal,
    closeModal: closeModal,
  };
  const modalContext = React.useMemo(()=>({
    ...modalContextBase,
    confirm: confirm.bind(modalContextBase),
    alert: alert.bind(modalContextBase)
  }), []);
  return (
    <ModalContext.Provider value={modalContext}>
      {children}
      {modals.map((modalOptions, i)=>(
        <ModalContainer key={i} {...modalOptions}/>
      ))}
    </ModalContext.Provider>
  );
}

ModalProvider.propTypes = {
  children: CustomPropTypes.children,
};

function PaperComponent(props) {
  return (
    <Draggable cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} style={{minWidth: '600px'}} />
    </Draggable>
  );
}

function ModalContainer({id, title, content}) {
  let useModalRef = useModal();
  let closeModal = ()=>useModalRef.closeModal(id);
  return (
    <Theme>
      <Dialog
        open={true}
        onClose={closeModal}
        PaperComponent={PaperComponent}
        disableBackdropClick
      >
        <DialogTitle>
          <Box marginRight="0.25rem">{title}</Box>
          <Box marginLeft="auto"><PgIconButton title={gettext('Close')} icon={<CloseIcon />} size="xs" noBorder onClick={closeModal}/></Box>
        </DialogTitle>
        <DialogContent>
          {content(closeModal)}
        </DialogContent>
      </Dialog>
    </Theme>
  );
}
ModalContainer.propTypes = {
  id: PropTypes.string,
  title: CustomPropTypes.children,
  content: PropTypes.func,
};
