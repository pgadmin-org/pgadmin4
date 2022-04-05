import React from 'react';
import { Box } from '@material-ui/core';
import InfoRoundedIcon from '@material-ui/icons/InfoRounded';
import { makeStyles } from '@material-ui/styles';
import PropTypes from 'prop-types';

const useStyles = makeStyles((theme)=>({
  root: {
    color: theme.palette.text.primary,
    margin: 'auto',
    marginTop: '24px',
    fontSize: '0.9em',
  },
}));

export default function EmptyPanelMessage({text}) {
  const classes = useStyles();
  return (
    <Box className={classes.root}>
      <InfoRoundedIcon />
      <span marginLeft='4px'>{text}</span>
    </Box>
  );
}
EmptyPanelMessage.propTypes = {
  text: PropTypes.string,
};
