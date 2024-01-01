/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import _ from 'lodash';
import { makeStyles } from '@material-ui/core';
import PropTypes from 'prop-types';
import CustomPropTypes from '../../../../../../static/js/custom_prop_types';

const useStyles = makeStyles((theme)=>({
  disabledCell: {
    opacity: theme.palette.action.disabledOpacity,
  }
}));

function NullAndDefaultFormatter({value, column, children, style}) {
  const classes = useStyles();
  if (_.isUndefined(value) && column.has_default_val) {
    return <div className={classes.disabledCell} style={style}>[default]</div>;
  } else if ((_.isUndefined(value) && column.not_null) ||
      (_.isUndefined(value) || _.isNull(value))) {
    return <div className={classes.disabledCell} style={style}>[null]</div>;
  }
  return children;
}
NullAndDefaultFormatter.propTypes = {
  value: PropTypes.any,
  column: PropTypes.object,
  children: CustomPropTypes.children,
  style: PropTypes.object,
};

const FormatterPropTypes = {
  row: PropTypes.object,
  column: PropTypes.object,
};
export function TextFormatter({row, column}) {
  let value = row[column.key];
  if(!_.isNull(value) && !_.isUndefined(value)) {
    value = value.toString();
  }
  return (
    <NullAndDefaultFormatter value={value} column={column}>
      <>{value}</>
    </NullAndDefaultFormatter>
  );
}
TextFormatter.propTypes = FormatterPropTypes;

export function NumberFormatter({row, column}) {
  let value = row[column.key];
  return (
    <NullAndDefaultFormatter value={value} column={column} style={{textAlign: 'right'}}>
      <div style={{textAlign: 'right'}}>{value}</div>
    </NullAndDefaultFormatter>
  );
}
NumberFormatter.propTypes = FormatterPropTypes;

export function BinaryFormatter({row, column}) {
  let value = row[column.key];
  const classes = useStyles();
  return (
    <NullAndDefaultFormatter value={value} column={column}>
      <span className={classes.disabledCell}>[{value}]</span>
    </NullAndDefaultFormatter>
  );
}
BinaryFormatter.propTypes = FormatterPropTypes;
