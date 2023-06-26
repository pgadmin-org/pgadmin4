/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import {Box, makeStyles} from '@material-ui/core';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import CustomPropTypes from '../custom_prop_types';

export const tabPanelStyles = makeStyles((theme)=>({
  root: {
    ...theme.mixins.tabPanel,
  },
  content: {
    height: '100%',
  }
}));

/* Material UI does not have any tabpanel component, we create one for us */
export default function TabPanel({children, classNameRoot, className, value, index, ...props}) {
  const classes = tabPanelStyles();
  const active = value === index;
  return (
    <Box className={clsx(classes.root, classNameRoot)} component="div" hidden={!active} data-test="tabpanel" {...props}>
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
