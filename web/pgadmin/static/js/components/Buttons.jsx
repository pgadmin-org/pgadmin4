/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Button, makeStyles, Tooltip } from '@material-ui/core';
import React, { forwardRef } from 'react';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';

const useStyles = makeStyles((theme)=>({
  primaryButton: {
    '&.Mui-disabled': {
      color: theme.palette.primary.contrastText,
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
    '&.Mui-disabled': {
      color: theme.palette.default.disabledContrastText,
      borderColor: theme.palette.default.disabledBorderColor
    },
    '&:hover': {
      backgroundColor: theme.palette.default.hoverMain,
      color: theme.palette.default.hoverContrastText,
      borderColor: theme.palette.default.hoverBorderColor,
    }
  },
  iconButton: {
    padding: '3px 6px',
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
    }
  }
}));

/* pgAdmin primary button */
export const PrimaryButton = forwardRef((props, ref)=>{
  let {children, className, ...otherProps} = props;
  const classes = useStyles();

  return (
    <Button ref={ref} variant="contained" color="primary" className={clsx(classes.primaryButton, className)} {...otherProps}>{children}</Button>
  );
});
PrimaryButton.displayName = 'PrimaryButton';
PrimaryButton.propTypes = {
  children: CustomPropTypes.children,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

/* pgAdmin default button */
export const DefaultButton = forwardRef((props, ref)=>{
  let {children, className, ...otherProps} = props;
  const classes = useStyles();

  return (
    <Button ref={ref} variant="outlined" color="default" className={clsx(classes.defaultButton, className)} {...otherProps}>{children}</Button>
  );
});
DefaultButton.displayName = 'DefaultButton';
DefaultButton.propTypes = {
  children: CustomPropTypes.children,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

/* pgAdmin Icon button, takes Icon component as input */
export const PgIconButton = forwardRef(({icon, title, className, ...props}, ref)=>{
  const classes = useStyles();

  /* Tooltip does not work for disabled items */
  return (
    <Tooltip title={title || ''} aria-label={title || ''}>
      <span>
        <DefaultButton ref={ref} style={{minWidth: 0}} className={clsx(classes.iconButton, className)} {...props}>
          {icon}
        </DefaultButton>
      </span>
    </Tooltip>
  );
});
PgIconButton.displayName = 'PgIconButton';
PgIconButton.propTypes = {
  icon: CustomPropTypes.children,
  title: PropTypes.string.isRequired,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};
