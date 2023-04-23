/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Box, Dialog, DialogContent, DialogTitle, makeStyles, Paper } from '@material-ui/core';
import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { getEpoch } from 'sources/utils';
import { DefaultButton, PgIconButton, PrimaryButton } from '../components/Buttons';
import Draggable from 'react-draggable';
import CloseIcon from '@material-ui/icons/CloseRounded';
import CustomPropTypes from '../custom_prop_types';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import HTMLReactParser from 'html-react-parser';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import { Rnd } from 'react-rnd';
import { ExpandDialogIcon, MinimizeDialogIcon } from '../components/ExternalIcon';

export const ModalContext = React.createContext({});
const MIN_HEIGHT = 190;
const MIN_WIDTH = 500;

export function useModal() {
  return React.useContext(ModalContext);
}
const useAlertStyles = makeStyles((theme) => ({
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

function AlertContent({ text, confirm, okLabel = gettext('OK'), cancelLabel = gettext('Cancel'), onOkClick, onCancelClick }) {
  const classes = useAlertStyles();
  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box flexGrow="1" p={2}>{typeof (text) == 'string' ? HTMLReactParser(text) : text}</Box>
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

function alert(title, text, onOkClick, okLabel = gettext('OK')) {
  // bind the modal provider before calling
  this.showModal(title, (closeModal) => {
    const onOkClickClose = () => {
      onOkClick && onOkClick();
      closeModal();
    };
    return (
      <AlertContent text={text} onOkClick={onOkClickClose} okLabel={okLabel} />
    );
  });
}

function confirm(title, text, onOkClick, onCancelClick, okLabel = gettext('Yes'), cancelLabel = gettext('No')) {
  // bind the modal provider before calling
  this.showModal(title, (closeModal) => {
    const onCancelClickClose = () => {
      onCancelClick && onCancelClick();
      closeModal();
    };
    const onOkClickClose = () => {
      onOkClick && onOkClick();
      closeModal();
    };
    return (
      <AlertContent text={text} confirm onOkClick={onOkClickClose} onCancelClick={onCancelClickClose} okLabel={okLabel} cancelLabel={cancelLabel} />
    );
  });
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
    alert: alert.bind(modalContextBase)
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

const dialogStyle = makeStyles((theme) => ({
  dialog: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid ' + theme.otherVars.inputBorderColor,
    borderRadius: theme.shape.borderRadius,
  },
  fullScreen: {
    transform: 'none !important'
  }
}));


function checkIsResizable(props) {
  return props.isresizeable == 'true' ? true : false;
}

function setEnableResizing(props, resizeable) {
  return props.isfullscreen == 'true' ? false : resizeable;
}

function PaperComponent({minHeight, minWidth, ...props}) {
  let classes = dialogStyle();
  let [dialogPosition, setDialogPosition] = useState(null);
  let resizeable = checkIsResizable(props);

  const setConditionalPosition = () => {
    return props.isfullscreen == 'true' ? { x: 0, y: 0 } : dialogPosition && { x: dialogPosition.x, y: dialogPosition.y };
  };

  const y_position = window.innerHeight*0.02; // 2% of total height
  const x_position =  props.width ? (window.innerWidth/2) - (props.width/2) : (window.innerWidth/2) - (MIN_WIDTH/2);

  return (
    props.isresizeable == 'true' ?
      <Rnd
        size={props.isfullscreen == 'true' && { width: '100%', height: '100%' }}
        className={clsx(classes.dialog, props.isfullscreen == 'true' ? classes.fullScreen : '')}
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
      </Rnd>
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

export const useModalStyles = makeStyles((theme) => ({
  container: {
    backgroundColor: theme.palette.background.default
  },

  titleBar: {
    display: 'flex',
    flexGrow: 1
  },
  title: {
    flexGrow: 1
  },
  icon: {
    fill: 'currentColor',
    width: '1em',
    height: '1em',
    display: 'inline-block',
    fontSize: '1.5rem',
    transition: 'none',
    flexShrink: 0,
    userSelect: 'none',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0.5rem',
    ...theme.mixins.panelBorder?.top,
  },
  margin: {
    marginLeft: '0.25rem',
  },
  iconButtonStyle: {
    marginLeft: 'auto',
    marginRight: '4px'
  }
}));

function ModalContainer({ id, title, content, dialogHeight, dialogWidth, onClose, fullScreen = false, isFullWidth = false, showFullScreen = false, isResizeable = false, minHeight = MIN_HEIGHT, minWidth = MIN_WIDTH, showTitle=true }) {
  let useModalRef = useModal();
  const classes = useModalStyles();
  let closeModal = (_e, reason) => {
    useModalRef.closeModal(id);
    if(reason == 'escapeKeyDown') {
      onClose?.();
    }
  };
  const [isfullScreen, setIsFullScreen] = useState(fullScreen);

  return (
    <Dialog
      open={true}
      onClose={closeModal}
      PaperComponent={PaperComponent}
      PaperProps={{ 'isfullscreen': isfullScreen.toString(), 'isresizeable': isResizeable.toString(), width: dialogWidth, height: dialogHeight, minHeight: minHeight, minWidth: minWidth }}
      fullScreen={isfullScreen}
      fullWidth={isFullWidth}
      disableBackdropClick={showTitle}
      disablePortal
    >
      { showTitle && <>
        <DialogTitle className='modal-drag-area'>
          <Box className={classes.titleBar}>
            <Box className={classes.title} marginRight="0.25rem" >{title}</Box>
            {
              showFullScreen && !isfullScreen &&
                <Box className={classes.iconButtonStyle}><PgIconButton title={gettext('Maximize')} icon={<ExpandDialogIcon className={classes.icon} />} size="xs" noBorder onClick={() => { setIsFullScreen(!isfullScreen); }} /></Box>
            }
            {
              showFullScreen && isfullScreen &&
                <Box className={classes.iconButtonStyle}><PgIconButton title={gettext('Minimize')} icon={<MinimizeDialogIcon  className={classes.icon} />} size="xs" noBorder onClick={() => { setIsFullScreen(!isfullScreen); }} /></Box>
            }

            <Box marginLeft="auto"><PgIconButton title={gettext('Close')} icon={<CloseIcon  />} size="xs" noBorder onClick={closeModal} /></Box>
          </Box>
        </DialogTitle>
      </>
      }
      <DialogContent height="100%">
        {useMemo(()=>{ return content(closeModal); }, [])}
      </DialogContent>
    </Dialog>
  );
}
ModalContainer.propTypes = {
  id: PropTypes.string,
  title: CustomPropTypes.children,
  content: PropTypes.func,
  fullScreen: PropTypes.bool,
  maxWidth: PropTypes.string,
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
