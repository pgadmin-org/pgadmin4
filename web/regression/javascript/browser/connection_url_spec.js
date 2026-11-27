/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { buildConnectionURL } from '../../../pgadmin/browser/server_groups/servers/databases/static/js/connection_url';

const param = (name, value)=>({name: name, keyword: name, value: value});

describe('buildConnectionURL', () => {
  it.each([
    ['a plain server', {host: 'db.example.com', port: 5432, username: 'postgres'},
      'postgres', 'postgresql://postgres@db.example.com:5432/postgres'],
    ['no username', {host: 'db.example.com', port: 5432},
      'app', 'postgresql://db.example.com:5432/app'],
    ['no port', {host: 'db.example.com', username: 'alice'},
      'app', 'postgresql://alice@db.example.com/app'],
    ['reserved characters in the user and database name',
      {host: 'db.example.com', port: 5432, username: 'jane@corp:x/y'},
      'my db/+?#%', 'postgresql://jane%40corp%3Ax%2Fy@db.example.com:5432/my%20db%2F%2B%3F%23%25'],
    ['an IPv6 address', {host: '2001:db8::1', port: 5433, username: 'u'},
      'd', 'postgresql://u@[2001:db8::1]:5433/d'],
    ['an IPv6 address already in brackets', {host: '[::1]', port: 5432, username: 'u'},
      'd', 'postgresql://u@[::1]:5432/d'],
    ['an IPv6 address with a zone ID', {host: 'fe80::1%eth0', port: 5432, username: 'u'},
      'd', 'postgresql://u@[fe80::1%25eth0]:5432/d'],
    ['a Unix socket directory', {host: '/var/run/postgresql', port: 5432, username: 'u'},
      'd', 'postgresql://u@%2Fvar%2Frun%2Fpostgresql:5432/d'],
    ['several hosts', {host: 'one.example.com, two.example.com', port: 5432, username: 'u'},
      'd', 'postgresql://u@one.example.com:5432,two.example.com:5432/d'],
    ['an empty entry in the host list', {host: 'primary,', port: 5432, username: 'u'},
      'd', 'postgresql://u@primary:5432,:5432/d'],
    ['an empty entry in the host list and no port', {host: ',primary'},
      'd', 'postgresql://,primary/d'],
    ['a service and no host', {service: 'my service', username: 'u'},
      'd', 'postgresql://u@/d?service=my%20service'],
    ['a service and no host or user', {service: 'svc'},
      'd', 'postgresql:///d?service=svc'],
  ])('builds the URL for %s', (_desc, server, dbname, expected) => {
    expect(buildConnectionURL(server, dbname)).toBe(expected);
  });

  it('appends stored connection parameters as query parameters', () => {
    const server = {
      host: 'db.example.com', port: 5432, username: 'u',
      connection_params: [
        param('sslmode', 'verify-full'),
        param('connect_timeout', 10),
        param('application_name', 'my app&co'),
        param('hostaddr', '192.0.2.1'),
        param('options', '-c search_path=a,b'),
        param('sslcompression', true),
        param('sslsni', false),
        param('sslrootcert', 'system'),
      ],
    };
    expect(buildConnectionURL(server, 'd')).toBe(
      'postgresql://u@db.example.com:5432/d?sslmode=verify-full' +
      '&connect_timeout=10&application_name=my%20app%26co' +
      '&hostaddr=192.0.2.1&options=-c%20search_path%3Da%2Cb' +
      '&sslcompression=1&sslsni=0&sslrootcert=system'
    );
  });

  it.each([
    ['true', '1'], ['On', '1'], ['1', '1'], ['yes', '1'],
    ['false', '0'], ['off', '0'], ['0', '0'], ['', '0'],
  ])('converts a stored sslsni of %j to %s, as the driver does', (value, expected) => {
    const server = {host: 'h', connection_params: [param('sslsni', value)]};
    expect(buildConnectionURL(server, 'd')).toBe('postgresql://h/d?sslsni=' + expected);
  });

  it('leaves out libpq defaults, empty values, secrets and local file paths', () => {
    const server = {
      host: 'db.example.com', port: 5432, username: 'u',
      password: 'should-not-appear',
      connection_params: [
        param('sslmode', 'prefer'),
        param('application_name', ''),
        param('target_session_attrs', null),
        param('password', 'should-not-appear'),
        param('sslpassword', 'should-not-appear'),
        param('oauth_client_secret', 'should-not-appear'),
        param('passfile', '/home/u/.pgpass'),
        param('sslcert', '/home/u/client.crt'),
        param('sslkey', '/home/u/client.key'),
        param('sslrootcert', '/home/u/root.crt'),
        param('sslcrl', '/home/u/root.crl'),
        param('sslcrldir', '/home/u/crl'),
        param('sslkeylogfile', '/home/u/keys.log'),
        param('servicefile', '/home/u/.pg_service.conf'),
        param('dbname', 'other'),
      ],
    };
    const url = buildConnectionURL(server, 'd');
    expect(url).toBe('postgresql://u@db.example.com:5432/d');
    expect(url).not.toContain('should-not-appear');
  });

  it('uses host, port, user and service connection parameters over the server\'s own', () => {
    const server = {
      host: 'display.example.com', port: 5432, username: 'u', service: 'a',
      connection_params: [
        param('host', 'actual.example.com'), param('port', 5433),
        param('user', 'other'), param('service', 'b'),
      ],
    };
    expect(buildConnectionURL(server, 'd')).toBe(
      'postgresql://other@actual.example.com:5433/d?service=b');
  });

  it.each([
    ['only the server service', {host: 'h', service: 'a'}, 'postgresql://h/d?service=a'],
    ['only a service connection parameter',
      {host: 'h', connection_params: [param('service', 'b')]}, 'postgresql://h/d?service=b'],
    ['an empty service connection parameter',
      {host: 'h', service: 'a', connection_params: [param('service', '')]}, 'postgresql://h/d?service=a'],
  ])('builds the service for %s', (_desc, server, expected) => {
    expect(buildConnectionURL(server, 'd')).toBe(expected);
  });

  it('uses the configured host and port for a server behind an SSH tunnel', () => {
    const server = {
      host: 'internal-db.example.com', port: 5432, username: 'u',
      use_ssh_tunnel: true, tunnel_host: 'bastion.example.com', tunnel_port: 22,
      tunnel_username: 'tunnel-user',
    };
    expect(buildConnectionURL(server, 'd')).toBe(
      'postgresql://u@internal-db.example.com:5432/d'
    );
  });
});
