/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useRef } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import PropTypes from 'prop-types';

import {
  MenuItem,
  ControlledMenu,
  Menu,
  SubMenu,
} from '@szhsin/react-menu';
export {MenuDivider as PgMenuDivider} from '@szhsin/react-menu';
import { shortcutToString } from './ShortcutTitle';
import CustomPropTypes from '../custom_prop_types';
import { Box } from '@mui/material';

export function PgMenu({open, className='', label, menuButton=null, ...props}) {
  const state = open ? 'open' : 'closed';
  props.anchorRef?.current?.setAttribute('data-state', state);

  if(menuButton) {
    return <Menu
      {...props}
      menuButton={menuButton}
      className={className}
      aria-label={label || 'Menu'}
      onContextMenu={(e)=>e.preventDefault()}
      viewScroll='close'
    />;
  }
  return (
    <ControlledMenu
      state={state}
      {...props}
      className={className}
      aria-label={label || 'Menu'}
      data-state={state}
      onContextMenu={(e)=>e.preventDefault()}
      viewScroll='close'
    />
  );
}

PgMenu.propTypes = {
  open: PropTypes.bool,
  className: CustomPropTypes.className,
  label: PropTypes.string,
  anchorRef: CustomPropTypes.ref,
  menuButton: PropTypes.element,
};

export const PgSubMenu = (({label, alignCheck, ...props})=>{
  if(alignCheck) {
    label = <><CheckIcon style={{visibility: 'hidden', width: '1.3rem'}} data-label="CheckIcon"/>{label}</>;
  }
  return (
    <SubMenu label={label}  itemProps={{'data-label': label}} {...props} />
  );
});

PgSubMenu.propTypes = {
  label: PropTypes.string,
  alignCheck: PropTypes.bool
};

export const PgMenuItem = (({hasCheck=false, checked=false, accesskey, shortcut, children, closeOnCheck=false, ...props})=>{

  let onClick = props.onClick;
  if(hasCheck) {
    onClick = (e)=>{
      e.keepOpen = !closeOnCheck;
      props.onClick(e);
    };
  }
  const keyVal = shortcutToString(shortcut, accesskey);

  const dataLabel = typeof(children) == 'string' ? children : props.datalabel;
  return <MenuItem {...props} onClick={onClick} data-label={dataLabel} data-checked={checked}>
    {hasCheck && <CheckIcon  style={checked ? {} : {visibility: 'hidden', width: '1.3rem'}} data-label="CheckIcon"/>}
    {children}
    <Box
      sx={{
        marginLeft: 'auto',
        paddingLeft: '12px',
        display: 'flex',
        gap: '1px',
        color: 'text.muted',
        '.szh-menu__item--hover &': {
          color: 'primary.contrastText',
        },
      }}
    >
      {Array.isArray(keyVal)
        ? keyVal.map((key, idx) => (
          <Box key={idx} component="div">{key}</Box>
        ))
        : <Box component="div"> {keyVal ? `${keyVal}` : ''}</Box>
      }
    </Box>
  </MenuItem>;
});

PgMenuItem.propTypes = {
  hasCheck: PropTypes.bool,
  checked: PropTypes.bool,
  accesskey: PropTypes.string,
  shortcut: CustomPropTypes.shortcut,
  children: CustomPropTypes.children,
  closeOnCheck: PropTypes.bool,
  onClick: PropTypes.func,
  datalabel: PropTypes.string,
};

export function usePgMenuGroup() {
  const [openMenuName, setOpenMenuName] = React.useState(null);
  const prevMenuOpenIdRef = useRef(null);

  const toggleMenu = React.useCallback((e)=>{
    const name = e.currentTarget?.getAttribute?.('name') || e.currentTarget?.name;
    setOpenMenuName(()=>{
      return prevMenuOpenIdRef.current == name ? null : name;
    });
    prevMenuOpenIdRef.current = null;
  }, []);

  const handleMenuClose = React.useCallback(()=>{
    /* We have no way here to know if the menu was closed using menu button or not
    We will keep the last menu name ref for sometime so that the menu does not
    open again if menu button is clicked to close the menu */
    prevMenuOpenIdRef.current = openMenuName;
    setTimeout(()=>{
      prevMenuOpenIdRef.current = null;
    }, 300);
    setOpenMenuName(null);
  }, [openMenuName]);

  return {
    openMenuName: openMenuName,
    toggleMenu: toggleMenu,
    onMenuClose: handleMenuClose,
  };
}
