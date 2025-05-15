import PropTypes from 'prop-types';
import React from 'react';
import gettext from 'sources/gettext';

export default function ErrorView({error, panelId, panelDocker, pgAdmin, toolName}){
  let header = gettext('Error while restore');
  let err_msg = gettext(`Unable to restore data for ${toolName} due to ${error}. On clicking the ok button, panel will be closed.`);
  pgAdmin.Browser.notifier.alert(header, err_msg, () => {
    if (panelId) {
      panelDocker.close(panelId, true);
    }
  });
  return <></>;
}

ErrorView.propTypes = {
  error: PropTypes.string,
  panelId: PropTypes.string,
  panelDocker: PropTypes.object,
  pgAdmin: PropTypes.object,
  toolName: PropTypes.string,
};