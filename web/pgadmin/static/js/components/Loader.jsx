/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { CircularProgress, Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';
import PropTypes from 'prop-types';

const StyledBox = styled(Box)(({theme}) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: theme.otherVars.loader.backgroundColor,
  color: theme.otherVars.loader.color,
  zIndex: 1000,
  display: 'flex',
  '& .Loader-loaderBody': {
    color: theme.otherVars.loader.color,
    display: 'flex',
    alignItems: 'center',
    margin: 'auto',
    '.MuiTypography-root': {
      marginLeft: theme.spacing(1),
    },
    '& .Loader-icon': {
      color: theme.otherVars.loader.color,
    },
    '& .Loader-message': {
      marginLeft: '0.5rem',
      fontSize: '16px',
    }
  },
}));

export default function Loader({message, style, autoEllipsis=false, ...props}) {

  if(!message) {
    return <></>;
  }
  return (
    <StyledBox style={style} data-label="loader" {...props}>
      <Box className='Loader-loaderBody'>
        <CircularProgress className='Loader-icon' />
        <Typography className='Loader-message'>{message}{autoEllipsis ? '...':''}</Typography>
      </Box>
    </StyledBox>
  );
}

Loader.propTypes = {
  message: PropTypes.string,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  autoEllipsis: PropTypes.bool,
};
