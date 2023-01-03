/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import gettext from 'sources/gettext';
import axios from 'axios';

/* Get the axios instance to call back end APIs.
Do not import axios directly, instead use this */
export default function getApiInstance(headers={}) {
  return axios.create({
    headers: {
      'Content-type': 'application/json',
      [pgAdmin.csrf_token_header]: pgAdmin.csrf_token,
      ...headers,
    }
  });
}

export function parseApiError(error) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    if(error.response.headers['content-type'] == 'application/json') {
      return error.response.data.errormsg;
    } else {
      return error.response.statusText;
    }
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    return gettext('Connection to pgAdmin server has been lost');
  } else if(error.message) {
    // Something happened in setting up the request that triggered an Error
    return error.message;
  } else if(error.errormsg) {
    // Received response JSON in socket handle
    return error.errormsg;
  } else {
    return error;
  }
}
