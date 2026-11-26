/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Connection parameters that are never put in a connection URL. Some hold a
// secret, which the URL must never carry. The rest name a file on the
// machine pgAdmin runs on (in server mode, one inside the user's storage
// directory), which would mean nothing to a client elsewhere. host, port,
// user and dbname already appear in the authority and path of the URL.
const EXCLUDED_PARAMS = new Set([
  'password', 'sslpassword', 'oauth_client_secret',
  'passfile', 'sslcert', 'sslkey', 'sslrootcert', 'sslcrl', 'sslcrldir',
  'sslkeylogfile', 'servicefile',
  'host', 'port', 'user', 'dbname',
]);

// pgAdmin stores these values for every new server, but they are libpq's own
// defaults, so adding them to the URL would change nothing.
const LIBPQ_DEFAULTS = {
  sslmode: 'prefer',
};

// Format one host for the authority of a libpq URI. A Unix-domain socket
// directory (or an abstract socket, which starts with '@') is percent-encoded
// whole, an IPv6 literal goes in square brackets, and anything else is
// percent-encoded.
function formatHost(host) {
  if (host.startsWith('/') || host.startsWith('@')) {
    return encodeURIComponent(host);
  }
  if (host.includes(':')) {
    // A zone ID (fe80::1%eth0) is the only part that can need encoding.
    const bare = host.replace(/^\[|\]$/g, '').replace(/%/g, '%25');
    return '[' + bare + ']';
  }
  return encodeURIComponent(host);
}

function formatParamValue(value) {
  // libpq takes 0 or 1 for its boolean parameters, which the server dialog
  // stores as true or false.
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  return String(value);
}

/*
 * Build a libpq connection URI, as described in "Connection URIs" in the
 * PostgreSQL documentation, from a server's properties and a database name:
 *
 *   postgresql://user@host:port/dbname?param=value&...
 *
 * Every component is percent-encoded. The password is never included. The
 * host and port are the ones configured for the server, so for a server
 * reached through an SSH tunnel they are the database server's address as
 * seen from the tunnel host, not the local end of the tunnel. A service and
 * any stored connection parameters that libpq accepts in a URI are added as
 * query parameters, except those listed in EXCLUDED_PARAMS and those equal
 * to libpq's own default.
 *
 * server is the object returned by the server properties endpoint; only
 * host, port, username, service and connection_params are read from it.
 */
export function buildConnectionURL(server, dbname) {
  let url = 'postgresql://';

  if (server?.username) {
    url += encodeURIComponent(server.username) + '@';
  }

  const host = (server?.host ?? '').trim();
  if (host) {
    // libpq accepts a comma-separated list of hosts; a single port applies to
    // each of them, so it is repeated after every host in the URI.
    const port = server.port ? ':' + server.port : '';
    url += host.split(',')
      .map((h)=>h.trim())
      .filter((h)=>h)
      .map((h)=>formatHost(h) + port)
      .join(',');
  } else if (server?.port) {
    url += ':' + server.port;
  }

  url += '/';
  if (dbname) {
    url += encodeURIComponent(dbname);
  }

  const query = [];
  const addParam = (name, value)=>{
    query.push(encodeURIComponent(name) + '=' +
      encodeURIComponent(formatParamValue(value)));
  };

  if (server?.service) {
    addParam('service', server.service);
  }

  for (const param of server?.connection_params ?? []) {
    const name = param?.name;
    const value = param?.value;
    // sslrootcert=system asks libpq for the system's trusted CAs, rather
    // than naming a file, so it is kept.
    if (!name || (EXCLUDED_PARAMS.has(name) &&
        !(name === 'sslrootcert' && value === 'system'))) {
      continue;
    }
    // The server's own service, added above, is the one pgAdmin uses.
    if (name === 'service' && server.service) {
      continue;
    }
    if (value === null || value === undefined || value === '') {
      continue;
    }
    if (LIBPQ_DEFAULTS[name] === formatParamValue(value)) {
      continue;
    }
    addParam(name, value);
  }

  if (query.length) {
    url += '?' + query.join('&');
  }

  return url;
}
