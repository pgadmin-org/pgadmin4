import { makeStyles } from '@material-ui/styles';
import React, { useRef } from 'react';
import CheckIcon from '@material-ui/icons/Check';
import PropTypes from 'prop-types';

import {
  MenuItem,
  ControlledMenu,
  applyStatics,
  Menu,
  SubMenu,
} from '@szhsin/react-menu';
export {MenuDivider as PgMenuDivider} from '@szhsin/react-menu';
import { shortcutToString } from './ShortcutTitle';
import clsx from 'clsx';
import CustomPropTypes from '../custom_prop_types';

const useStyles = makeStyles((theme)=>({
  menu: {
    '& .szh-menu': {
      padding: '4px 0px',
      zIndex: 1005,
      backgroundColor: theme.palette.background.default,
      color: theme.palette.text.primary,
      border: `1px solid ${theme.otherVars.borderColor}`
    },
    '& .szh-menu__divider': {
      margin: 0,
      background: theme.otherVars.borderColor,
    },
    '& .szh-menu__item': {
      display: 'flex',
      padding: '4px 12px',
      '&:after': {
        right: '0.75rem',
      },
      '&.szh-menu__item--active, &.szh-menu__item--hover': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
      }
    }
  },
  checkIcon: {
    width: '1.3rem',
  },
  hideCheck: {
    visibility: 'hidden',
  },
  shortcut: {
    marginLeft: 'auto',
    fontSize: '0.8em',
    paddingLeft: '12px',
  }
}));

export function PgMenu({open, className='', label, menuButton=null, ...props}) {
  const classes = useStyles();
  const state = open ? 'open' : 'closed';
  props.anchorRef?.current?.setAttribute('data-state', state);

  if(menuButton) {
    return <Menu
      {...props}
      menuButton={menuButton}
      className={clsx(classes.menu, className)}
      aria-label={label || 'Menu'}
      onContextMenu={(e)=>e.preventDefault()}
      viewScroll='close'
    />;
  }
  return (
    <ControlledMenu
      state={state}
      {...props}
      className={clsx(classes.menu, className)}
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
  menuButton: PropTypes.oneOfType([React.ReactNode, undefined]),
};

export const PgSubMenu = applyStatics(SubMenu)(({label, ...props})=>{
  return (
    <SubMenu label={label}  itemProps={{'data-label': label}} {...props} />
  );
});

export const PgMenuItem = applyStatics(MenuItem)(({hasCheck=false, checked=false, accesskey, shortcut, children, closeOnCheck=false, ...props})=>{
  const classes = useStyles();
  let onClick = props.onClick;
  if(hasCheck) {
    onClick = (e)=>{
      e.keepOpen = !closeOnCheck;
      props.onClick(e);
    };
  }
  const dataLabel = typeof(children) == 'string' ? children : undefined;
  return <MenuItem {...props} onClick={onClick} data-label={dataLabel} data-checked={checked}>
    {hasCheck && <CheckIcon className={classes.checkIcon} style={checked ? {} : {visibility: 'hidden'}} />}
    {children}
    {(shortcut || accesskey) && <div className={classes.shortcut}>({shortcutToString(shortcut, accesskey)})</div>}
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
};

export function usePgMenuGroup() {
  const [openMenuName, setOpenMenuName] = React.useState(null);
  const prevMenuOpenIdRef = useRef(null);

  const toggleMenu = React.useCallback((e)=>{
    setOpenMenuName(()=>{
      return prevMenuOpenIdRef.current == e.currentTarget?.name ? null : e.currentTarget?.name;
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
