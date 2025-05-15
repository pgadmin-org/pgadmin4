/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import PropTypes from 'prop-types';
import { FormHelperText } from '@mui/material';
import HTMLReactParse from 'html-react-parser';

const StyledBox = styled(Box)(({theme}) => ({
  color: theme.palette.text.primary,
  margin: '24px auto 12px',
  fontSize: '0.8rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
}));

export default function EmptyPanelMessage({text, style, error}) {

  return (
    <StyledBox style={style}>
      { error ? <FormHelperText variant="outlined" error= {true}  style={{marginLeft: '4px'}} >{HTMLReactParse(error)}</FormHelperText> :
        <div>
          <InfoRoundedIcon style={{height: '1.2rem'}}/>
          <span style={{marginLeft: '4px'}}>{text}</span>
        </div>}
    </StyledBox>
  );
}
EmptyPanelMessage.propTypes = {
  text: PropTypes.string,
  style: PropTypes.object,
  error: PropTypes.string,
};
