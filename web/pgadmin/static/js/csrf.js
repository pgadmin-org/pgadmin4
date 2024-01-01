/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import axios from 'axios';

export function setPGCSRFToken(header, token) {
  if (!token) {
    // Throw error message.
    throw new Error('csrf-token meta tag has not been set');
  }

  // Configure axios to set 'X-CSRFToken' request header for
  // every requests.
  axios.interceptors.request.use(function (config) {
    config.headers[header] = token;

    return config;
  }, function (error) {
    return Promise.reject(error);
  });

}
