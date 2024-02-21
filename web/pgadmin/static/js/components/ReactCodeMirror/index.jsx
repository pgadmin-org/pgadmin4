/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { makeStyles } from '@material-ui/core';
import clsx from 'clsx';
import Editor from './Editor';
import CustomPropTypes from '../../custom_prop_types';

const useStyles = makeStyles(() => ({
  root: {
    position: 'relative',
  },
}));

export default function CodeMirror({className, ...props}) {
  const classes = useStyles();
  return (
    <div className={clsx(className, classes.root)}>
      <Editor {...props} />
    </div>
  );
}

CodeMirror.propTypes = {
  className: CustomPropTypes.className,
};