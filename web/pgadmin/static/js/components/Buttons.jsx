/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Button, ButtonGroup, makeStyles, Tooltip } from '@material-ui/core';
import React, { forwardRef } from 'react';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';
import ShortcutTitle from './ShortcutTitle';

const useStyles = makeStyles((theme)=>({
  primaryButton: {
    border: '1px solid '+theme.palette.primary.main,
    '&.Mui-disabled': {
      color: [theme.palette.primary.contrastText,'!important'],
      backgroundColor: theme.palette.primary.disabledMain,
    },
    '&:hover': {
      backgroundColor: theme.palette.primary.hoverMain,
      borderColor: theme.palette.primary.hoverBorderColor,
    },
  },
  defaultButton: {
    backgroundColor: theme.palette.default.main,
    color: theme.palette.default.contrastText,
    border: '1px solid '+theme.palette.default.borderColor,
    whiteSpace: 'nowrap',
    '&.Mui-disabled': {
      color: [theme.palette.default.disabledContrastText, '!important'],
      borderColor: theme.palette.default.disabledBorderColor
    },
    '&:hover': {
      backgroundColor: theme.palette.default.hoverMain,
      color: theme.palette.default.hoverContrastText,
      borderColor: theme.palette.default.hoverBorderColor,
    }
  },
  iconButton: {
    minWidth: 0,
    padding: '2px 4px',
    '&.MuiButton-sizeSmall, &.MuiButton-outlinedSizeSmall, &.MuiButton-containedSizeSmall': {
      padding: '1px 4px',
    },
  },
  iconButtonDefault: {
    borderColor: theme.custom.icon.borderColor,
    color: theme.custom.icon.contrastText,
    backgroundColor: theme.custom.icon.main,
    '&.Mui-disabled': {
      borderColor: theme.custom.icon.disabledBorderColor,
      backgroundColor: theme.custom.icon.disabledMain,
      color: theme.custom.icon.disabledContrastText,
    },
    '&:hover': {
      backgroundColor: theme.custom.icon.hoverMain,
      color: theme.custom.icon.hoverContrastText,
      borderColor: theme.custom.icon.borderColor,
    },
  },
  splitButton: {
    '&.MuiButton-sizeSmall, &.MuiButton-outlinedSizeSmall, &.MuiButton-containedSizeSmall': {
      width: '20px',
      '& svg': {
        height: '0.8em',
      }
    },
  },
  xsButton: {
    padding: '2px 1px',
    height: '24px',
    minWidth: '24px',
    '& .MuiSvgIcon-root': {
      height: '0.8em',
    },
    '.MuiButtonGroup-root &': {
      minWidth: '30px',
    }
  },
  noBorder: {
    border: 0,
    backgroundColor: 'transparent',
    color: theme.custom.icon.contrastText,
    '&:hover': {
      border: 0,
      color: theme.custom.icon.contrastText,
      backgroundColor: 'inherit',
      filter: 'brightness(85%)',
    },
    '&.Mui-disabled': {
      border: 0,
    },
  },
  noBorderPrimary: {
    color: theme.palette.primary.contrastText,
    backgroundColor: theme.palette.primary.main,
    '&:hover': {
      color: theme.palette.primary.contrastText,
      backgroundColor: theme.palette.primary.hoverMain,
      borderColor: theme.palette.primary.hoverBorderColor,
    },
  }
}));

/* pgAdmin primary button */
export const PrimaryButton = forwardRef((props, ref)=>{
  let {children, className, size, noBorder, ...otherProps} = props;
  const classes = useStyles();
  let allClassName = [classes.primaryButton, className];
  if(size == 'xs') {
    size = undefined;
    allClassName.push(classes.xsButton);
  }
  noBorder && allClassName.push(...[classes.noBorder, classes.noBorderPrimary]);
  const dataLabel = typeof(children) == 'string' ? children : undefined;
  return (
    <Button ref={ref} size={size} className={clsx(allClassName)} data-label={dataLabel} {...otherProps} variant="contained" color="primary">{children}</Button>
  );
});
PrimaryButton.displayName = 'PrimaryButton';
PrimaryButton.propTypes = {
  size: PropTypes.string,
  noBorder: PropTypes.bool,
  children: CustomPropTypes.children,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

/* pgAdmin default button */
export const DefaultButton = forwardRef((props, ref)=>{
  let {children, className, size, noBorder, ...otherProps} = props;
  const classes = useStyles();
  let allClassName = [classes.defaultButton, className];
  if(size == 'xs') {
    size = undefined;
    allClassName.push(classes.xsButton);
  }
  noBorder && allClassName.push(classes.noBorder);
  const dataLabel = typeof(children) == 'string' ? children : undefined;
  return (
    <Button variant="outlined" color="default" ref={ref} size={size} className={clsx(allClassName)} data-label={dataLabel} {...otherProps}>{children}</Button>
  );
});
DefaultButton.displayName = 'DefaultButton';
DefaultButton.propTypes = {
  size: PropTypes.string,
  noBorder: PropTypes.bool,
  children: CustomPropTypes.children,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};


/* pgAdmin Icon button, takes Icon component as input */
export const PgIconButton = forwardRef(({icon, title, shortcut, className, splitButton, style, color, accesskey, ...props}, ref)=>{
  const classes = useStyles();

  let shortcutTitle = null;
  if(accesskey || shortcut) {
    shortcutTitle = <ShortcutTitle title={title} accesskey={accesskey} shortcut={shortcut}/>;
  }

  /* Tooltip does not work for disabled items */
  if(props.disabled) {
    if(color == 'primary') {
      return (
        <PrimaryButton ref={ref} style={style}
          className={clsx(classes.iconButton, (splitButton ? classes.splitButton : ''), className)}
          accessKey={accesskey} data-label={title || ''} {...props}>
          {icon}
        </PrimaryButton>
      );
    } else {
      return (
        <DefaultButton ref={ref} style={style}
          className={clsx(classes.iconButton, classes.iconButtonDefault, (splitButton ? classes.splitButton : ''), className)}
          accessKey={accesskey} data-label={title || ''} {...props}>
          {icon}
        </DefaultButton>
      );
    }
  } else {
    if(color == 'primary') {
      return (
        <Tooltip title={shortcutTitle || title || ''} aria-label={title || ''}>
          <PrimaryButton ref={ref} style={style}
            className={clsx(classes.iconButton, (splitButton ? classes.splitButton : ''), className)}
            accessKey={accesskey} data-label={title || ''} {...props}>
            {icon}
          </PrimaryButton>
        </Tooltip>
      );
    } else {
      return (
        <Tooltip title={shortcutTitle || title || ''} aria-label={title || ''}>
          <DefaultButton ref={ref} style={style}
            className={clsx(classes.iconButton, classes.iconButtonDefault, (splitButton ? classes.splitButton : ''), className)}
            accessKey={accesskey} data-label={title || ''} {...props}>
            {icon}
          </DefaultButton>
        </Tooltip>
      );
    }
  }
});
PgIconButton.displayName = 'PgIconButton';
PgIconButton.propTypes = {
  icon: CustomPropTypes.children,
  title: PropTypes.string.isRequired,
  shortcut: CustomPropTypes.shortcut,
  accesskey: PropTypes.string,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  style: PropTypes.object,
  color: PropTypes.oneOf(['primary', 'default', undefined]),
  disabled: PropTypes.bool,
  splitButton: PropTypes.bool,
};

export const PgButtonGroup = forwardRef(({children, ...props}, ref)=>{
  /* Tooltip does not work for disabled items */
  return (
    <ButtonGroup innerRef={ref} {...props}>
      {children}
    </ButtonGroup>
  );
});
PgButtonGroup.displayName = 'PgButtonGroup';
PgButtonGroup.propTypes = {
  children: CustomPropTypes.children,
};
