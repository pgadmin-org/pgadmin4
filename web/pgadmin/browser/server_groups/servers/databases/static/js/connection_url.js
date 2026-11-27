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
// user and service are handled separately (see effectiveParam), and the
// database is always the one the URL is copied for.
const EXCLUDED_PARAMS = new Set([
  'password', 'sslpassword', 'oauth_client_secret',
  'passfile', 'sslcert', 'sslkey', 'sslrootcert', 'sslcrl', 'sslcrldir',
  'sslkeylogfile', 'servicefile',
  'host', 'port', 'user', 'dbname', 'service',
]);

// libpq's boolean parameters, which pgAdmin's driver converts to 0 or 1.
const BOOLEAN_PARAMS = new Set(['sslcompression', 'sslsni']);

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

// libpq takes 0 or 1 for its boolean parameters. The server dialog stores
// them as true or false, but an imported server may hold a string such as
// 'true' or 'off', so they are converted as connection_param_bool_to_int()
// in pgadmin/utils/__init__.py does for the driver.
function formatBooleanParam(value) {
  if (typeof value === 'string') {
    return ['', '0', 'false', 'f', 'no', 'n', 'off']
      .includes(value.trim().toLowerCase()) ? '0' : '1';
  }
  return value ? '1' : '0';
}

function formatParamValue(name, value) {
  if (BOOLEAN_PARAMS.has(name) || typeof value === 'boolean') {
    return formatBooleanParam(value);
  }
  return String(value);
}

// pgAdmin's driver applies the stored connection parameters after the
// server's own host, port, username and service, so a parameter of the same
// name is the value actually used. Returns that value, or the server's own.
function effectiveParam(server, name, serverValue) {
  const param = (server?.connection_params ?? []).find((p)=>p?.name === name);
  const value = param?.value;
  if (value === null || value === undefined || value === '') {
    return serverValue;
  }
  return value;
}

/*
 * Build a libpq connection URI, as described in "Connection URIs" in the
 * PostgreSQL documentation, from a server's properties and a database name:
 *
 *   postgresql://user@host:port/dbname?param=value&...
 *
 * Every component is percent-encoded. The password is never included. A
 * host, port, user or service connection parameter takes the place of the
 * server's own value, as it does when pgAdmin connects. The host and port
 * are the ones configured for the server, so for a server
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

  const username = effectiveParam(server, 'user', server?.username);
  const host = String(effectiveParam(server, 'host', server?.host) ?? '').trim();
  const port = effectiveParam(server, 'port', server?.port);
  const service = effectiveParam(server, 'service', server?.service);

  if (username) {
    url += encodeURIComponent(username) + '@';
  }

  if (host) {
    // libpq accepts a comma-separated list of hosts, and of ports. A single
    // port applies to every host, so it is repeated after each one in the
    // URI; otherwise each port goes with the host in the same position. An
    // empty entry in either list is kept, as libpq uses its default (local)
    // connection or port for it.
    const ports = String(port ?? '').split(',').map((p)=>p.trim());
    url += host.split(',')
      .map((h)=>h.trim())
      .map((h, i)=>{
        const hostPort = ports.length === 1 ? ports[0] : ports[i];
        return (h ? formatHost(h) : '') + (hostPort ? ':' + hostPort : '');
      })
      .join(',');
  } else if (port) {
    url += ':' + port;
  }

  url += '/';
  if (dbname) {
    url += encodeURIComponent(dbname);
  }

  const query = [];
  const addParam = (name, value)=>{
    query.push(encodeURIComponent(name) + '=' +
      encodeURIComponent(formatParamValue(name, value)));
  };

  if (service) {
    addParam('service', service);
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
    // An empty boolean is still passed on by the driver, as 0.
    if (value === null || value === undefined ||
        (value === '' && !BOOLEAN_PARAMS.has(name))) {
      continue;
    }
    if (LIBPQ_DEFAULTS[name] === formatParamValue(name, value)) {
      continue;
    }
    addParam(name, value);
  }

  if (query.length) {
    url += '?' + query.join('&');
  }

  return url;
}
