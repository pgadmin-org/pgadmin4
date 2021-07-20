import { makeStyles } from '@material-ui/core';
import React from 'react';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';

const useStyles = makeStyles((theme)=>({
  fieldset: {
    padding: theme.spacing(0.5),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'inherit',
    border: '1px solid ' + theme.otherVars.borderColor,
  },
  legend: {
    width: 'unset',
    fontSize: 'inherit',
    fontWeight: 'bold',
  }
}));

export default function FieldSet({title='', className, children}) {
  const classes = useStyles();
  return (
    <fieldset className={clsx(classes.fieldset, className)}>
      <legend className={classes.legend}>{title}</legend>
      {children}
    </fieldset>
  );
}

FieldSet.propTypes = {
  title: PropTypes.string,
  className: CustomPropTypes.className,
  children: CustomPropTypes.children,
};
