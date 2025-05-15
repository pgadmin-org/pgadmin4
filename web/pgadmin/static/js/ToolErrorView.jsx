import PropTypes from 'prop-types';
import React from 'react';
import gettext from 'sources/gettext';
import { LAYOUT_EVENTS } from './helpers/Layout';
import EmptyPanelMessage from './components/EmptyPanelMessage';

export default function ToolErrorView({error, panelId, panelDocker}){

  panelDocker.eventBus.registerListener(LAYOUT_EVENTS.CLOSING, (id)=>{
    if(panelId == id) {
      panelDocker.close(panelId, true);
    }
  });

  let err_msg = gettext(`Unable to restore data due to error: ${error}`);
  return <EmptyPanelMessage error={gettext(err_msg)}/>;
}

ToolErrorView.propTypes = {
  error: PropTypes.string,
  panelId: PropTypes.string,
  panelDocker: PropTypes.object,
  pgAdmin: PropTypes.object,
  toolName: PropTypes.string,
};