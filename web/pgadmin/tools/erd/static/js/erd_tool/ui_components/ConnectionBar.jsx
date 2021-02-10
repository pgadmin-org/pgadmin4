/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';

export const STATUS = {
  CONNECTED: 1,
  DISCONNECTED: 2,
  CONNECTING: 3,
  FAILED: 4,
};

/* The connection bar component */
export default function ConnectionBar({statusId, status, bgcolor, fgcolor, title}) {
  return (
    <div className="connection_status_wrapper d-flex">
      <div id={statusId}
        role="status"
        className="connection_status d-flex justify-content-center align-items-center" data-container="body"
        data-toggle="popover" data-placement="bottom"
        data-content=""
        data-panel-visible="visible"
        tabIndex="0">
        <span className={'pg-font-icon d-flex m-auto '
            + (status == STATUS.CONNECTED ? 'icon-connected' : '')
            + (status == (STATUS.DISCONNECTED || STATUS.FAILED) ? 'icon-disconnected ' : '')
            + (status == STATUS.CONNECTING ? 'obtaining-conn' : '')}
        aria-hidden="true" title="" role="img">
        </span>
      </div>
      <div className="connection-info btn-group" role="group" aria-label="">
        <div className="editor-title"
          style={{backgroundColor: bgcolor, color: fgcolor}}>
          {status == STATUS.CONNECTING ? '(' + gettext('Obtaining connection...') + ') ' : ''}
          {status == STATUS.FAILED ? '(' + gettext('Connection failed') + ') ' : ''}
          {title}
        </div>
      </div>
    </div>
  );
}

ConnectionBar.propTypes = {
  statusId: PropTypes.string.isRequired,
  status: PropTypes.oneOf(Object.values(STATUS)).isRequired,
  bgcolor: PropTypes.string,
  fgcolor: PropTypes.string,
  title: PropTypes.string.isRequired,
};
