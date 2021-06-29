/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { CircularProgress, Box, Typography, makeStyles } from '@material-ui/core';
import React from 'react';
import PropTypes from 'prop-types';

const useStyles = makeStyles((theme)=>({
  root: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.otherVars.loader.backgroundColor,
    color: theme.otherVars.loader.color,
    zIndex: 1000,
    display: 'flex',
  },
  loaderRoot: {
    color: theme.otherVars.loader.color,
    display: 'flex',
    alignItems: 'center',
    margin: 'auto',
    '.MuiTypography-root': {
      marginLeft: theme.spacing(1),
    }
  },
  loader: {
    color: theme.otherVars.loader.color,
  }
}));

export default function Loader({message}) {
  const classes = useStyles();
  if(!message) {
    return <></>;
  }
  return (
    <Box className={classes.root}>
      <Box className={classes.loaderRoot}>
        <CircularProgress className={classes.loader} />
        <Typography>{message}</Typography>
      </Box>
    </Box>
  );
}

Loader.propTypes = {
  message: PropTypes.string,
};
