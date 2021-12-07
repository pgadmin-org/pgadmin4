/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Box, Dialog, DialogContent, DialogTitle, Paper } from '@material-ui/core';
import React from 'react';
import {getEpoch} from 'sources/utils';
import { PgIconButton } from '../components/Buttons';
import Draggable from 'react-draggable';
import CloseIcon from '@material-ui/icons/CloseRounded';
import CustomPropTypes from '../custom_prop_types';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';

const ModalContext = React.createContext({});

export function useModal() {
  return React.useContext(ModalContext);
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
  const modalContext = React.useMemo(()=>({
    showModal: showModal,
    closeModal: closeModal,
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
  );
}
ModalContainer.propTypes = {
  id: PropTypes.string,
  title: CustomPropTypes.children,
  content: PropTypes.func,
};
