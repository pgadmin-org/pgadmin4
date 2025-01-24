/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Box, Dialog, DialogContent, DialogTitle, Paper } from '@mui/material';
import React, { useState, useMemo } from 'react';
import { getEpoch } from 'sources/utils';
import { DefaultButton, PgIconButton, PrimaryButton } from '../components/Buttons';
import Draggable from 'react-draggable';
import CloseIcon from '@mui/icons-material/CloseRounded';
import DeleteIcon from '@mui/icons-material/Delete';
import CustomPropTypes from '../custom_prop_types';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import HTMLReactParser from 'html-react-parser';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { Rnd } from 'react-rnd';
import { ExpandDialogIcon, MinimizeDialogIcon, DisconnectedIcon } from '../components/ExternalIcon';
import { styled } from '@mui/material/styles';

export const ModalContext = React.createContext({});
const MIN_HEIGHT = 190;
const MIN_WIDTH = 500;
const StyledBox = styled(Box)(({theme}) => ({
  '& .Alert-footer': {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0.5rem',
    ...theme.mixins.panelBorder.top,
  },
  '& .Alert-margin': {
    marginLeft: '0.25rem',
  },
}));

const buttonIconMap = {
  disconnect: <DisconnectedIcon />,
  default: <CheckRoundedIcon />
};

export function useModal() {
  return React.useContext(ModalContext);
}

function AlertContent({ text, confirm, okLabel = gettext('OK'), cancelLabel = gettext('Cancel'), onOkClick, onCancelClick, okIcon = 'default'}) {
  return (
    <StyledBox display="flex" flexDirection="column" height="100%">
      <Box flexGrow="1" p={2} whiteSpace='pre-line'>{typeof (text) == 'string' ? HTMLReactParser(text) : text}</Box>
      <Box className='Alert-footer'>
        {confirm &&
          <DefaultButton startIcon={<CloseIcon />} onClick={onCancelClick}>{cancelLabel}</DefaultButton>
        }
        <PrimaryButton className='Alert-margin' startIcon={buttonIconMap[okIcon]} onClick={onOkClick} autoFocus>{okLabel}</PrimaryButton>
      </Box>
    </StyledBox>
  );
}
AlertContent.propTypes = {
  text: PropTypes.string,
  confirm: PropTypes.bool,
  onOkClick: PropTypes.func,
  onCancelClick: PropTypes.func,
  okLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  okIcon : PropTypes.string
};

function alert(title, text, onOkClick, okLabel = gettext('OK')) {
  // bind the modal provider before calling
  this.showModal(title, (closeModal) => {
    const onOkClickClose = () => {
      onOkClick?.();
      closeModal();
    };
    return (
      <AlertContent text={text} onOkClick={onOkClickClose} okLabel={okLabel} />
    );
  });
}

function confirm(title, text, onOkClick, onCancelClick, okLabel = gettext('Yes'), cancelLabel = gettext('No'), okIcon = 'default') {
  // bind the modal provider before calling
  this.showModal(title, (closeModal) => {
    const onCancelClickClose = () => {
      onCancelClick?.();
      closeModal();
    };

    const onOkClickClose = () => {
      onOkClick?.();
      closeModal();
    };
    return (
      <AlertContent text={text} confirm onOkClick={onOkClickClose} onCancelClick={onCancelClickClose} okLabel={okLabel} cancelLabel={cancelLabel} okIcon={okIcon}/>
    );
  });
}

function confirmDelete(title, text, onDeleteClick, onCancelClick, deleteLabel = gettext('Delete'), cancelLabel = gettext('Cancel')) {
  this.showModal(
    title,
    (closeModal)=>{
      const handleOkClose = (callback) => {
        callback();
        closeModal();
      };
      return (
        <StyledBox display="flex" flexDirection="column" height="100%">
          <Box flexGrow="1" p={2}>
            {typeof (text) == 'string' ? HTMLReactParser(text) : text}
          </Box>
          <Box className='Alert-footer'>
            <DefaultButton className='Alert-margin' startIcon={<CloseIcon />} onClick={() => handleOkClose(onCancelClick)} autoFocus>{cancelLabel}</DefaultButton>
            <DefaultButton className='Alert-margin' color={'error'} startIcon={<DeleteIcon/> } onClick={() => handleOkClose(onDeleteClick)}>{deleteLabel}</DefaultButton>
          </Box>
        </StyledBox>
      );
    },
    { isFullScreen: false, isResizeable: false, showFullScreen: false, isFullWidth: false, showTitle: true},
  );
}

export default function ModalProvider({ children }) {
  const [modals, setModals] = React.useState([]);

  const showModal = (title, content, modalOptions) => {
    let id = getEpoch().toString() + crypto.getRandomValues(new Uint8Array(4));
    setModals((prev) => [...prev, {
      id: id,
      title: title,
      content: content,
      ...modalOptions,
    }]);
  };
  const closeModal = (id) => {
    setModals((prev) => {
      return prev.filter((o) => o.id != id);
    });
  };

  const fullScreenModal = (fullScreen) => {
    setModals((prev) => [...prev, {
      fullScreen: fullScreen,
    }]);
  };

  const modalContextBase = {
    showModal: showModal,
    closeModal: closeModal,
    fullScreenModal: fullScreenModal
  };
  const modalContext = React.useMemo(() => ({
    ...modalContextBase,
    confirm: confirm.bind(modalContextBase),
    alert: alert.bind(modalContextBase),
    confirmDelete: confirmDelete.bind(modalContextBase)
  }), []);
  return (
    <ModalContext.Provider value={modalContext}>
      {children}
      {modals.map((modalOptions) => (
        <ModalContainer key={modalOptions.id} {...modalOptions} />
      ))}
    </ModalContext.Provider>
  );
}

ModalProvider.propTypes = {
  children: CustomPropTypes.children,
};

const StyledRnd = styled(Rnd)(({theme}) => ({
  '&.Dialog-content': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid ' + theme.otherVars.inputBorderColor,
    borderRadius: theme.shape.borderRadius,
  },
  '&.Dialog-fullScreen': {
    transform: 'none !important'
  },
}));


function checkIsResizable(props) {
  return props.isresizeable == 'true';
}

function setEnableResizing(props, resizeable) {
  return props.isfullscreen == 'true' ? false : resizeable;
}

function PaperComponent({minHeight, minWidth, ...props}) {
  let [dialogPosition, setDialogPosition] = useState(null);
  let resizeable = checkIsResizable(props);

  const setConditionalPosition = () => {
    return props.isfullscreen == 'true' ? { x: 0, y: 0 } : dialogPosition && { x: dialogPosition.x, y: dialogPosition.y };
  };

  const y_position = window.innerHeight*0.02; // 2% of total height
  const x_position =  props.width ? (window.innerWidth/2) - (props.width/2) : (window.innerWidth/2) - (MIN_WIDTH/2);

  return (
    props.isresizeable == 'true' ?
      <StyledRnd
        size={props.isfullscreen == 'true' && { width: '100%', height: '100%' }}
        className={'Dialog-content ' + ( props.isfullscreen == 'true' ? 'Dialog-fullScreen' : '')}
        default={{
          x: x_position,
          y: y_position,
          ...(props.width && { width: props.width }),
          ...(props.height && { height: props.height }),
        }}
        minWidth = { minWidth || MIN_WIDTH }
        minHeight = { minHeight || MIN_HEIGHT }
        // {...(props.width && { minWidth: MIN_WIDTH })}
        // {...(props.height && { minHeight: MIN_HEIGHT })}
        bounds="window"
        enableResizing={setEnableResizing(props, resizeable)}
        position={setConditionalPosition()}
        onDragStop={(e, position) => {
          if (props.isfullscreen !== 'true') {
            setDialogPosition({
              ...position,
            });
          }
        }}
        onResize={(e, direction, ref, delta, position) => {
          setDialogPosition({
            ...position,
          });
        }}
        dragHandleClassName="modal-drag-area"
      >
        <Paper {...props} style={{ width: '100%', height: '100%', maxHeight: '100%', maxWidth: '100%' }} />
      </StyledRnd>
      :
      <Draggable cancel={'[class*="MuiDialogContent-root"]'}>
        <Paper {...props} style={{ minWidth: '600px' }} />
      </Draggable>
  );
}

PaperComponent.propTypes = {
  isfullscreen: PropTypes.string,
  isresizeable: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  minWidth: PropTypes.number,
  minHeight: PropTypes.number,
};

const StyleDialog = styled(Dialog)(({theme}) => ({
  '& .Modal-container': {
    backgroundColor: theme.palette.background.default
  },
  '& .Modal-titleBar': {
    display: 'flex',
    flexGrow: 1
  },
  '& .Modal-icon': {
    fill: 'currentColor',
    width: '1em',
    height: '1em',
    display: 'inline-block',
    fontSize: '1.5rem',
    transition: 'none',
    flexShrink: 0,
    userSelect: 'none',
  },
  '& .Modal-footer': {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0.5rem',
    ...theme.mixins.panelBorder?.top,
  },
  '& .Modal-iconButtonStyle': {
    marginLeft: 'auto',
    marginRight: '4px'
  },
}));

function ModalContainer({ id, title, content, dialogHeight, dialogWidth, onClose, fullScreen = false, isFullWidth = false, showFullScreen = false, isResizeable = false, minHeight = MIN_HEIGHT, minWidth = MIN_WIDTH, showTitle=true }) {
  let useModalRef = useModal();
  let closeModal = (_e, reason) => {
    if(reason == 'backdropClick' && showTitle) {
      return;
    }
    useModalRef.closeModal(id);
    if(reason == 'escapeKeyDown' || reason == undefined) {
      onClose?.();
    }
  };
  const [isFullScreen, setIsFullScreen] = useState(fullScreen);

  return (
    <StyleDialog
      open={true}
      onClose={closeModal}
      PaperComponent={PaperComponent}
      PaperProps={{ 'isfullscreen': isFullScreen.toString(), 'isresizeable': isResizeable.toString(), width: dialogWidth, height: dialogHeight, minHeight: minHeight, minWidth: minWidth }}
      fullScreen={isFullScreen}
      fullWidth={isFullWidth}
      disablePortal
    >
      { showTitle &&
        <DialogTitle className='modal-drag-area'>
          <Box className='Modal-titleBar'>
            <Box sx={{ marginRight:'0.25rem', flexGrow: 1}}>{title}</Box>
            {
              showFullScreen && !isFullScreen &&
                <Box className='Modal-iconButtonStyle'><PgIconButton title={gettext('Maximize')} icon={<ExpandDialogIcon className='Modal-icon' />} size="xs" noBorder onClick={() => { setIsFullScreen(!isFullScreen); }} /></Box>
            }
            {
              showFullScreen && isFullScreen &&
                <Box className='Modal-iconButtonStyle'><PgIconButton title={gettext('Minimize')} icon={<MinimizeDialogIcon  className='Modal-icon' />} size="xs" noBorder onClick={() => { setIsFullScreen(!isFullScreen); }} /></Box>
            }

            <Box marginLeft="auto"><PgIconButton title={gettext('Close')} icon={<CloseIcon  />} size="xs" noBorder onClick={closeModal} /></Box>
          </Box>
        </DialogTitle>
      }
      <DialogContent height="100%">
        {useMemo(()=>{ return content(closeModal); }, [])}
      </DialogContent>
    </StyleDialog>
  );
}
ModalContainer.propTypes = {
  id: PropTypes.string,
  title: CustomPropTypes.children,
  content: PropTypes.func,
  fullScreen: PropTypes.bool,
  isFullWidth: PropTypes.bool,
  showFullScreen: PropTypes.bool,
  isResizeable: PropTypes.bool,
  dialogHeight: PropTypes.number,
  dialogWidth: PropTypes.number,
  onClose: PropTypes.func,
  minWidth: PropTypes.number,
  minHeight: PropTypes.number,
  showTitle: PropTypes.bool,
};
