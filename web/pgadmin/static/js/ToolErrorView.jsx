import PropTypes from 'prop-types';
import React from 'react';
import gettext from 'sources/gettext';
import { LAYOUT_EVENTS } from './helpers/Layout';
import { styled } from '@mui/material/styles';
import { FormHelperText, Box } from '@mui/material';
import HTMLReactParse from 'html-react-parser';
import { deleteToolData } from '../../settings/static/ApplicationStateProvider';

const StyledBox = styled(Box)(({theme}) => ({
  color: theme.palette.text.primary,
  margin: '24px auto 12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
}));

export default function ToolErrorView({error, panelId, panelDocker, toolDataId}){
  panelDocker.eventBus.registerListener(LAYOUT_EVENTS.CLOSING, (id)=>{
    if(panelId == id) {
      panelDocker.close(panelId, true);
      if(toolDataId){
        let transId = toolDataId.replace('-','_');
        deleteToolData(transId, transId);
      }
    }
  });

  let err_msg = gettext(`An error occurred while opening the tool: ${error}`);
  return  (<StyledBox>
    <FormHelperText variant="outlined" error= {true}  style={{marginLeft: '4px'}} >{HTMLReactParse(err_msg)}</FormHelperText>
  </StyledBox>);
}

ToolErrorView.propTypes = {
  error: PropTypes.string,
  panelId: PropTypes.string,
  panelDocker: PropTypes.object,
  toolDataId: PropTypes.string
};