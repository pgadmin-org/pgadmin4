/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import getApiInstance from '../../../static/js/api_instance';
import pgAdmin from 'sources/pgadmin';

const axiosApi = getApiInstance();
let HEARTBEAT_TIMEOUT = pgAdmin.heartbeat_timeout * 1000;

export function send_heartbeat(_server_id, _item) {

  // Send heartbeat to the server every 30 seconds
  _item.heartbeat = setInterval(function() {
    axiosApi.post(url_for('misc.log_heartbeat'), {'sid': _server_id})
      .then((data) => {
        if (data.status !== 200) {
          stop_heartbeat(_item);
        }
      })
      .catch((error) => {
        if (error && error.message == 'Network Error') {
          pgAdmin.Browser.notifier.error(gettext(`pgAdmin server not responding, try to login again: ${error.message || error.response.data.errormsg}`));
        } else {
          pgAdmin.Browser.notifier.error(gettext(`Server heartbeat logging error: ${error.message || error.response.data.errormsg}`));
        }
        stop_heartbeat(_item);
      });

  }, HEARTBEAT_TIMEOUT);
}


export function stop_heartbeat(_obj) {
  let _item = _obj.item || _obj,
    _id = _item.getMetadata('data')._id;
  clearInterval(_item.heartbeat);
  axiosApi.post(url_for('misc.stop_heartbeat'), {'sid': _id});
}
