/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import {Box, makeStyles} from '@material-ui/core';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';

const useStyles = makeStyles((theme)=>({
  root: {
    height: '100%',
    padding: theme.spacing(1),
    overflow: 'auto',
    backgroundColor: theme.palette.grey[400]
  },
  content: {
    height: '100%',
  }
}));

/* Material UI does not have any tabpanel component, we create one for us */
export default function TabPanel({children, classNameRoot, className, value, index}) {
  const classes = useStyles();
  const active = value === index;
  return (
    <Box className={clsx(classes.root, classNameRoot)} component="div" hidden={!active}>
      <Box className={clsx(classes.content, className)}>{children}</Box>
    </Box>
  );
}

TabPanel.propTypes = {
  children: CustomPropTypes.children,
  classNameRoot: CustomPropTypes.className,
  className: CustomPropTypes.className,
  value: PropTypes.any.isRequired,
  index: PropTypes.any.isRequired,
};
