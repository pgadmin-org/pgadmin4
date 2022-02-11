import { makeStyles } from '@material-ui/styles';
import React from 'react';
import CheckIcon from '@material-ui/icons/Check';
import PropTypes from 'prop-types';

import {
  MenuItem,
  ControlledMenu,
  applyStatics,
} from '@szhsin/react-menu';
export {MenuDivider as PgMenuDivider} from '@szhsin/react-menu';
import { shortcutToString } from './ShortcutTitle';
import clsx from 'clsx';
import CustomPropTypes from '../custom_prop_types';

const useStyles = makeStyles((theme)=>({
  menu: {
    '& .szh-menu': {
      padding: '4px 0px',
      zIndex: 1000,
    },
    '& .szh-menu__divider': {
      margin: 0,
    }
  },
  menuItem: {
    display: 'flex',
    padding: '4px 8px',
    '&.szh-menu__item--active, &.szh-menu__item--hover': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
    }
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

export function PgMenu({open, className, ...props}) {
  const classes = useStyles();
  return (
    <ControlledMenu
      state={open ? 'open' : 'closed'}
      {...props}
      className={clsx(classes.menu, className)}
    />
  );
}

PgMenu.propTypes = {
  open: PropTypes.bool,
  className: CustomPropTypes.className,
};

export const PgMenuItem = applyStatics(MenuItem)(({hasCheck=false, checked=false, accesskey, shortcut, children, ...props})=>{
  const classes = useStyles();
  let onClick = props.onClick;
  if(hasCheck) {
    onClick = (e)=>{
      e.keepOpen = true;
      props.onClick(e);
    };
  }
  return <MenuItem {...props} onClick={onClick} className={classes.menuItem}>
    {hasCheck && <CheckIcon style={checked ? {} : {visibility: 'hidden'}}/>}
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
  onClick: PropTypes.func,
};
