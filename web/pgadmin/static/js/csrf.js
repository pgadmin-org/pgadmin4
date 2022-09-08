/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
import Backbone from 'backbone';
import axios from 'axios';

export function setPGCSRFToken(header, token) {
  if (!token) {
    // Throw error message.
    throw new Error('csrf-token meta tag has not been set');
  }

  // Configure Backbone.sync to set CSRF-Token-header request header for
  // every requests except GET.
  let origBackboneSync = Backbone.sync;
  Backbone.sync = function(method, model, options) {
    options.beforeSend = function(xhr) {
      xhr.setRequestHeader(header, token);
    };

    return origBackboneSync(method, model, options);
  };

  // Configure Backbone.get to set 'X-CSRFToken' request header for
  // GET requests.
  let origBackboneGet = Backbone.get;
  Backbone.get = function(method, model, options) {
    options.beforeSend = function(xhr) {
      xhr.setRequestHeader(header, token);
    };

    return origBackboneGet(method, model, options);
  };

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
