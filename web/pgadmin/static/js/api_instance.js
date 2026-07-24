/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
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

/* Tracks GET requests that are currently in flight, keyed by the resolved URL +
 * params. This lets concurrent callers asking for the exact same resource
 * (e.g. every column row's Data Type dropdown mounting at once on a wide table)
 * share a single HTTP request instead of each firing their own identical GET.
 */
const _inflightGetRequests = new Map();

/* Builds a key that is independent of object key insertion order, so that
 * {a:1, b:2} and {b:2, a:1} (and nested variants) resolve to the same key. */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  return '{' + Object.keys(value).sort().map(
    (key) => JSON.stringify(key) + ':' + stableStringify(value[key])
  ).join(',') + '}';
}

/* Like api.get(url, config), but shares a single in-flight request among all
 * concurrent callers requesting the same url + params. The shared entry is
 * removed once the request settles (success or failure), so it never leaks and
 * later calls fetch fresh data. Each caller attaches its own then/catch, so
 * response handling (transform, caching, etc.) stays per-caller. */
export function getInflight(api, url, config={}) {
  const key = url + '#' + stableStringify(config.params ?? {});
  let request = _inflightGetRequests.get(key);
  if (!request) {
    request = api.get(url, config).finally(() => {
      _inflightGetRequests.delete(key);
    });
    _inflightGetRequests.set(key, request);
  }
  return request;
}

export function parseApiError(error, withData=false) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    if(error.response.headers['content-type'] == 'application/json') {
      let err_resp_data = error.response.data;
      if (err_resp_data.response != undefined && Array.isArray(err_resp_data.response.errors)) {
        return err_resp_data.response.errors[0];
      } else {
        let errormsg = err_resp_data.errormsg;
        let data = error.response.data.data;
        // If we want to use data which came with error set withData
        // flag to true.
        return withData ? {errormsg, data} : errormsg;
      }
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

export function callFetch(url, options, headers={}) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-type': 'application/json',
      [pgAdmin.csrf_token_header]: pgAdmin.csrf_token,
      ...headers,
    }
  });
}
