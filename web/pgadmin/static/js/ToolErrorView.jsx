import PropTypes from 'prop-types';
import React from 'react';
import gettext from 'sources/gettext';
import { LAYOUT_EVENTS } from './helpers/Layout';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
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

export default function ToolErrorView({error, panelId, panelDocker}){

  panelDocker.eventBus.registerListener(LAYOUT_EVENTS.CLOSING, (id)=>{
    if(panelId == id) {
      panelDocker.close(panelId, true);
    }
  });

  let err_msg = gettext(`There was some error while opening: ${error}`);
  return  (<StyledBox>
    <FormHelperText variant="outlined" error= {true}  style={{marginLeft: '4px'}} >{HTMLReactParse(err_msg)}</FormHelperText>
  </StyledBox>);
}

ToolErrorView.propTypes = {
  error: PropTypes.string,
  panelId: PropTypes.string,
  panelDocker: PropTypes.object,
  pgAdmin: PropTypes.object,
  toolName: PropTypes.string,
};