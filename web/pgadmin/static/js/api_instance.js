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

/* Tracks GET requests that are currently in flight, keyed by the request axios
 * will actually make (see requestKey below). This lets concurrent callers asking
 * for the exact same resource (e.g. every column row's Data Type dropdown
 * mounting at once on a wide table) share a single HTTP request instead of each
 * firing their own identical GET.
 */
const _inflightGetRequests = new Map();

/* Config keys whose effect on the request is fully captured by the dedup key:
 * params and paramsSerializer both land in the URI that api.getUri() builds,
 * and headers are hashed into the key directly. Anything else changes what a
 * caller gets back or how it can be aborted (transformResponse, responseType,
 * validateStatus, timeout, signal/cancelToken, onDownloadProgress, ...), so a
 * request carrying any of those is never shared. */
const SHAREABLE_CONFIG_KEYS = ['params', 'headers', 'paramsSerializer'];

/* Builds a key that is independent of object key insertion order, so that
 * {a:1, b:2} and {b:2, a:1} (and nested variants) resolve to the same key.
 * Values are expected to be plain JSON-like ones (primitives, plain objects,
 * arrays); exotic inputs like Date/Map/cyclic objects are out of scope.
 * Primitives are type-tagged so that values that share a JSON form but differ
 * in type never collide, e.g. the number 1 vs the string "1", or an array hole
 * ([undefined]) vs the empty array ([]). */
function stableStringify(value) {
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null || typeof value !== 'object') {
    return typeof value + ':' + JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  return '{' + Object.keys(value).sort().map(
    (key) => JSON.stringify(key) + ':' + stableStringify(value[key])
  ).join(',') + '}';
}

/* Sorts params so that callers passing the same values in a different order
 * still share a request. axios serialises params in insertion order, so this
 * only reorders the query string, it never changes which values are sent.
 * Arrays keep their order, as position is significant in the query string. */
function canonicaliseParams(params) {
  if (params instanceof URLSearchParams) {
    const sorted = new URLSearchParams(params);
    sorted.sort();
    return sorted;
  }
  if (params === null || typeof params !== 'object' || Array.isArray(params)) {
    return params;
  }
  return Object.keys(params).sort().reduce((acc, key) => {
    acc[key] = canonicaliseParams(params[key]);
    return acc;
  }, {});
}

/* Keys a GET on the request axios will actually issue, so two calls share a
 * response only when that response would have been identical anyway:
 *
 * - api.getUri() resolves the URI exactly as the request will, honouring the
 *   instance baseURL, plain-object params, URLSearchParams and any custom
 *   paramsSerializer, so params that differ only on the wire never collide.
 * - The instance's header config is included, so instances built with extra
 *   headers (e.g. getApiInstance({'Content-Encoding': 'gzip'})) never share
 *   with plain ones, whilst the fresh-but-identical instances that callers
 *   typically create still do.
 * - Per-request config.headers are included for the same reason. */
function requestKey(api, url, config) {
  const uri = api.getUri({
    ...config, url, params: canonicaliseParams(config.params),
  });
  return uri
    + '#' + stableStringify(api.defaults?.headers ?? {})
    + '#' + stableStringify(config.headers ?? {});
}

/* Like api.get(url, config), but shares a single in-flight request among all
 * concurrent callers requesting the same url + params + headers. The shared
 * entry is removed once the request settles (success or failure), so it never
 * leaks and later calls fetch fresh data. Each caller attaches its own
 * then/catch, so response handling (transform, caching, etc.) stays per-caller.
 *
 * Callers share the response object itself, so treat it as read-only. Requests
 * whose config carries anything beyond SHAREABLE_CONFIG_KEYS are passed
 * straight through to api.get() rather than shared. */
export function getInflight(api, url, config={}) {
  const shareable = Object.keys(config).every(
    (key) => SHAREABLE_CONFIG_KEYS.includes(key)
  );
  if (!shareable) {
    return api.get(url, config);
  }

  const key = requestKey(api, url, config);
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
