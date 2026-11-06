##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests that in server mode a connection can only use a libpq service
listed in SERVER_MODE_ALLOWED_SERVICES, and never a password or service
set in the environment of the account pgAdmin runs as.

Services are read from that account's service file, whose entries can
hold a password, so without these checks any user could connect with the
credentials of any service it defines.
"""

import os
import shutil
import tempfile
import unittest
from unittest.mock import patch

import psycopg

from pgadmin.utils import ServiceNotAllowed, \
    remove_inherited_libpq_credentials
from pgadmin.utils.route import BaseTestGenerator

import pgadmin.utils.driver.psycopg3.server_manager as server_manager

SERVICE = 'pga_test_service'


class _ServiceMixin:
    """A home directory with nothing in it, and a service file defining
    SERVICE with the test server's password."""

    def setUp(self):
        # Filesystem-only tests: skip BaseTestGenerator's server setup.
        unittest.TestCase.setUp(self)
        self.tmp = os.path.realpath(
            tempfile.mkdtemp(prefix='pga_service_allowlist_'))
        self.home = os.path.join(self.tmp, 'home')
        os.makedirs(self.home)
        self.service_file = os.path.join(self.tmp, 'pg_service.conf')

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _write_service_file(self, server, with_host=True):
        lines = ['[{0}]'.format(SERVICE),
                 'password={0}'.format(server['db_password']),
                 'user={0}'.format(server['username'])]
        if with_host:
            lines += ['host={0}'.format(server['host']),
                      'port={0}'.format(server['port'])]
        with open(self.service_file, 'w') as f:
            f.write('\n'.join(lines) + '\n')

    def _mode(self, server_mode, allowed=()):
        return [
            patch.dict(self.app.config, {
                'SERVER_MODE': server_mode,
                'SERVER_MODE_ALLOWED_SERVICES': list(allowed)}),
            patch.object(self.app, 'PGADMIN_RUNTIME', False),
            patch('pgadmin.utils.get_storage_directory',
                  return_value=self.tmp),
        ]

    @staticmethod
    def _manager(service=None, connection_params=None, host='127.0.0.1',
                 port=5432):
        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.host = host
        manager.port = port
        manager.use_ssh_tunnel = False
        manager.service = service
        manager.connection_params = connection_params or {}
        return manager

    def _connection_string(self, manager, server_mode=True, allowed=(),
                           database='postgres', user='alice'):
        patches = self._mode(server_mode, allowed)
        with self.app.test_request_context():
            for p in patches:
                p.start()
            try:
                return manager.create_connection_string(database, user)
            finally:
                for p in reversed(patches):
                    p.stop()

    @staticmethod
    def _connect(dsn, env):
        """Connect with exactly the libpq variables in env set, returning
        (connection or None, error)."""
        with patch.dict(os.environ, {}):
            for var in ('PGPASSWORD', 'PGPASSFILE', 'PGSERVICE',
                        'PGSERVICEFILE', 'PGSYSCONFDIR'):
                os.environ.pop(var, None)
            os.environ.update(env)
            try:
                return psycopg.connect(dsn, connect_timeout=10), None
            except psycopg.OperationalError as e:
                return None, str(e)


class ConnectionStringServiceTestCase(_ServiceMixin, BaseTestGenerator):
    """create_connection_string() refuses a service that is not allowed,
    whether it is the server's service or a connection parameter."""

    scenarios = [
        ('Server mode refuses the server\'s service when none are allowed',
         dict(service=SERVICE, refused=True)),
        ('Server mode refuses a service that is not listed',
         dict(service=SERVICE, allowed=['another'], refused=True)),
        ('Server mode refuses a service set as a connection parameter',
         dict(params={'service': SERVICE}, refused=True)),
        # 'servicefile' is refused either way: on a libpq that does not list
        # it as a keyword the connection-param key validation rejects it as an
        # invalid parameter, and on one that does the service allowlist refuses
        # it. Both are PermissionErrors and both name 'servicefile'.
        ('Server mode refuses a service file connection parameter',
         dict(params={'servicefile': '/etc/pg_service.conf'},
              allowed=[SERVICE], refused=True, exc=PermissionError,
              message='servicefile')),
        # make_conninfo() does not escape parameter keys, so a crafted key
        # smuggles its own service= into the connection string and past the
        # dict check, which matches the exact key 'service'. Such a key is
        # never a libpq keyword, so the connection-param key validation refuses
        # it as an invalid parameter before it can be serialised.
        ('Server mode refuses a service smuggled through a crafted key',
         dict(params={'sslmode=prefer service': SERVICE}, refused=True,
              exc=PermissionError, message='Invalid connection parameter')),
        ('Server mode allows a listed service',
         dict(service=SERVICE, allowed=[SERVICE])),
        ('Server mode allows a listed service as a connection parameter',
         dict(params={'service': SERVICE}, allowed=[SERVICE])),
        ('A lone string is not treated as a list of characters',
         dict(service='pga', allowed=SERVICE, refused=True)),
        ('A lone string allows that service',
         dict(service=SERVICE, allowed=SERVICE)),
        ('Server mode allows a server with no service',
         dict()),
        ('Desktop mode allows any service',
         dict(service=SERVICE, server_mode=False)),
    ]

    service = None
    params = None
    allowed = ()
    server_mode = True
    refused = False
    # The exception a refused case raises. The service allowlist raises
    # ServiceNotAllowed; a parameter key that is not a libpq keyword is refused
    # earlier by the key validation as a plain PermissionError.
    # ServiceNotAllowed is itself a PermissionError, so a case that can be
    # refused by either path uses PermissionError here.
    exc = ServiceNotAllowed
    message = 'SERVER_MODE_ALLOWED_SERVICES'

    def runTest(self):
        manager = self._manager(self.service, self.params)
        patches = [
            patch.dict(self.app.config, {
                'SERVER_MODE': self.server_mode,
                'SERVER_MODE_ALLOWED_SERVICES': self.allowed}),
            patch.object(self.app, 'PGADMIN_RUNTIME', False),
            patch('pgadmin.utils.get_storage_directory',
                  return_value=self.tmp),
        ]
        with self.app.test_request_context():
            for p in patches:
                p.start()
            try:
                if self.refused:
                    with self.assertRaises(self.exc) as cm:
                        manager.create_connection_string('postgres', 'alice')
                    self.assertIn(self.message, str(cm.exception))
                    # The connect paths report a PermissionError's message.
                    self.assertIsInstance(cm.exception, PermissionError)
                else:
                    dsn = manager.create_connection_string(
                        'postgres', 'alice')
                    if self.service or self.params:
                        self.assertIn(SERVICE, dsn)
            finally:
                for p in reversed(patches):
                    p.stop()


class InheritedCredentialsTestCase(_ServiceMixin, BaseTestGenerator):
    """Connect through the real libpq, with no password of the user's own,
    whilst the environment pgAdmin inherited holds a password or names a
    service that has one. Each lets the connection in until
    remove_inherited_libpq_credentials() runs, as it does at startup in
    server mode, and none does afterwards."""

    scenarios = [
        ('PGPASSWORD inherited from the service account',
         dict(var='PGPASSWORD')),
        ('PGSERVICE inherited from the service account',
         dict(var='PGSERVICE')),
    ]

    def runTest(self):
        server = self.server
        self._write_service_file(server, with_host=False)
        env = {'HOME': self.home, 'PGSERVICEFILE': self.service_file}
        if self.var == 'PGPASSWORD':
            env['PGPASSWORD'] = server['db_password']
        else:
            env['PGSERVICE'] = SERVICE

        manager = self._manager(
            connection_params={'sslmode': server.get('sslmode', 'prefer')},
            host=server['host'], port=server['port'])
        dsn = self._connection_string(manager, database=server['db'],
                                      user=server['username'])

        conn, error = self._connect(dsn, env)
        if conn is None:
            self.skipTest('The test server cannot be reached this way: '
                          '{0}'.format(error))
        conn.close()

        with patch.dict(os.environ, env):
            # The runner's own environment may already hold the other
            # inherited credential variable (CI sets PGPASSWORD); drop it so
            # the scenario sees only the one it set.
            for other in ('PGPASSWORD', 'PGSERVICE'):
                if other != self.var:
                    os.environ.pop(other, None)
            removed = remove_inherited_libpq_credentials()
            remaining = dict(os.environ)
        self.assertEqual(removed, [self.var])
        self.assertNotIn(self.var, remaining)
        # The service file location is kept, for the listed services.
        self.assertEqual(remaining.get('PGSERVICEFILE'), self.service_file)

        env.pop(self.var)
        conn, error = self._connect(dsn, env)
        if conn is not None:
            conn.close()
            self.skipTest('The test server does not ask for a password.')
        self.assertIn('no password supplied', error)


class ListedServiceTestCase(_ServiceMixin, BaseTestGenerator):
    """Connect through the real libpq to a server that uses a service:
    with the service listed it connects using the service's password, and
    without it no connection is attempted."""

    scenarios = [
        ('A listed service connects', dict(allowed=[SERVICE])),
        ('A service that is not listed is refused', dict(allowed=[])),
    ]

    def runTest(self):
        server = self.server
        self._write_service_file(server)
        env = {'HOME': self.home, 'PGSERVICEFILE': self.service_file}

        manager = self._manager(
            service=SERVICE,
            connection_params={'sslmode': server.get('sslmode', 'prefer')},
            host=None, port=None)

        if not self.allowed:
            with self.assertRaises(ServiceNotAllowed):
                self._connection_string(manager, allowed=self.allowed,
                                        database=server['db'], user=None)
            return

        dsn = self._connection_string(manager, allowed=self.allowed,
                                      database=server['db'], user=None)
        conn, error = self._connect(dsn, env)
        self.assertIsNotNone(conn, error)
        conn.close()
