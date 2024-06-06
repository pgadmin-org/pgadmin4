import React from 'react';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import PropTypes from 'prop-types';

const StyledBox = styled(Box)(({theme}) => ({
  color: theme.palette.text.primary,
  margin: '24px auto 12px',
  fontSize: '0.8rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
}));

export default function EmptyPanelMessage({text, style}) {

  return (
    <StyledBox style={style}>
      <InfoRoundedIcon style={{height: '1.2rem'}}/>
      <span style={{marginLeft: '4px'}}>{text}</span>
    </StyledBox>
  );
}
EmptyPanelMessage.propTypes = {
  text: PropTypes.string,
  style: PropTypes.object,
};
