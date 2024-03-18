/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import PropTypes from 'prop-types';
import { Box, makeStyles } from '@material-ui/core';


const useStyles = makeStyles((theme) => ({
  root: {
    ...theme.mixins.panelBorder.all,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden !important',
    height: '100%',
    width: '100%',
    minHeight: '400px',
  },
  cardHeader: {
    backgroundColor: theme.otherVars.tableBg,
    borderBottom: '1px solid',
    borderBottomColor: theme.otherVars.borderColor,
    display: 'flex',
    alignItems: 'center',
  },
  cardTitle: {
    padding: '0.25rem 0.5rem',
    fontWeight: 'bold',
  }
}));

export default function SectionContainer({title, titleExtras, children, style}) {
  const classes = useStyles();

  return (
    <Box className={classes.root} style={style}>
      <Box className={classes.cardHeader} title={title}>
        <div className={classes.cardTitle}>{title}</div>
        <div style={{marginLeft: 'auto'}}>
          {titleExtras}
        </div>
      </Box>
      <Box height="100%" display="flex" flexDirection="column">
        {children}
      </Box>
    </Box>
  );
}

SectionContainer.propTypes = {
  title: PropTypes.string.isRequired,
  titleExtras: PropTypes.node,
  children: PropTypes.node.isRequired,
  style: PropTypes.object,
};
