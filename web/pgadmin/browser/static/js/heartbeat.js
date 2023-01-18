/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import getApiInstance from '../../../static/js/api_instance';
import Notifier from '../../../static/js/helpers/Notifier';
import pgAdmin from 'sources/pgadmin';

const axiosApi = getApiInstance();
let HEARTBEAT_TIMEOUT = pgAdmin.heartbeat_timeout * 1000;

export function send_heartbeat(_server_id) {
  // Send heartbeat to the server every 30 seconds
  setInterval(function() {
    axiosApi.post(url_for('misc.heartbeat'), {'sid': _server_id})
      .then(() => {
        // pass
      })
      .catch((error) => {
        Notifier.error(gettext(`pgAdmin server not responding, try to login again: ${error.message || error.response.data.errormsg}`));
      });

  }, HEARTBEAT_TIMEOUT);
}
