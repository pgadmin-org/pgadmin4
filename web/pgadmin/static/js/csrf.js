/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
import axios from 'axios';

export function setPGCSRFToken(header, token) {
  if (!token) {
    // Throw error message.
    throw new Error('csrf-token meta tag has not been set');
  }

  // Configure jquery.ajax to set 'X-CSRFToken' request header for
  // every requests.
  $.ajaxSetup({
    beforeSend: function(xhr) {
      xhr.setRequestHeader(header, token);
    },
  });

  // Configure axios to set 'X-CSRFToken' request header for
  // every requests.
  axios.interceptors.request.use(function (config) {
    config.headers[header] = token;

    return config;
  }, function (error) {
    return Promise.reject(error);
  });

}
