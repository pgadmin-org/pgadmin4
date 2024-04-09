import React from 'react';
import { Box } from '@mui/material';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import { makeStyles } from '@mui/styles';
import PropTypes from 'prop-types';

const useStyles = makeStyles((theme)=>({
  root: {
    color: theme.palette.text.primary,
    margin: '24px auto 12px',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
}));

export default function EmptyPanelMessage({text, style}) {
  const classes = useStyles();
  return (
    <Box className={classes.root} style={style}>
      <InfoRoundedIcon style={{height: '1.2rem'}}/>
      <span style={{marginLeft: '4px'}}>{text}</span>
    </Box>
  );
}
EmptyPanelMessage.propTypes = {
  text: PropTypes.string,
  style: PropTypes.object,
};
