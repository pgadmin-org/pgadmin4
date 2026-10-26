##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests that in server mode libpq is never left to find a password file,
client certificate or client key by itself.

Without one of these parameters, libpq uses ~/.pgpass,
~/.postgresql/postgresql.crt or ~/.postgresql/postgresql.key from the home
directory of the account it runs as, which in server mode belongs to the
pgAdmin service, not to the user making the connection.
"""

import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import psycopg
from psycopg.conninfo import conninfo_to_dict, make_conninfo

from pgadmin.utils import NO_CLIENT_FILE, fs_short_path
from pgadmin.utils.route import BaseTestGenerator

import pgadmin.utils.driver.psycopg3 as psycopg3_driver
import pgadmin.utils.driver.psycopg3.server_manager as server_manager

CREDENTIAL_FILES = ('passfile', 'sslcert', 'sslkey')


class _StorageMixin:
    """A storage directory for the user, holding a password file, a CRL
    directory and nothing else."""

    def setUp(self):
        # Filesystem-only tests: skip BaseTestGenerator's server setup.
        unittest.TestCase.setUp(self)
        self.storage = os.path.realpath(
            tempfile.mkdtemp(prefix='pga_client_files_'))
        with open(os.path.join(self.storage, '.pgpass'), 'w') as f:
            f.write('*:*:*:*:secret\n')
        os.makedirs(os.path.join(self.storage, 'crls'))

    def tearDown(self):
        shutil.rmtree(self.storage, ignore_errors=True)

    def _mode(self, server_mode):
        """The patches for server or desktop mode, with self.storage as the
        user's storage directory."""
        return [
            patch.dict(self.app.config, {'SERVER_MODE': server_mode}),
            patch.object(self.app, 'PGADMIN_RUNTIME', False),
            patch('pgadmin.utils.get_storage_directory',
                  return_value=self.storage),
        ]

    @staticmethod
    def _manager(connection_params):
        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.host = '127.0.0.1'
        manager.port = 5432
        manager.use_ssh_tunnel = False
        manager.service = None
        manager.connection_params = connection_params
        return manager

    def _connection_string(self, connection_params, server_mode=True):
        manager = self._manager(connection_params)
        patches = self._mode(server_mode)
        with self.app.test_request_context():
            for p in patches:
                p.start()
            try:
                dsn = manager.create_connection_string('postgres', 'alice')
            finally:
                for p in reversed(patches):
                    p.stop()
        return conninfo_to_dict(dsn), \
            conninfo_to_dict(manager.display_connection_string)


class ConnectionStringClientFilesTestCase(_StorageMixin, BaseTestGenerator):
    """The connection string names every credential file in server mode,
    and passes a configured file on even if it does not exist."""

    scenarios = [
        ('Server mode with nothing configured',
         dict(params={}, expected={'passfile': NO_CLIENT_FILE,
                                   'sslcert': NO_CLIENT_FILE,
                                   'sslkey': NO_CLIENT_FILE})),
        ('Server mode with empty values, as the dialog leaves them',
         dict(params={'passfile': '', 'sslcert': '', 'sslkey': ''},
              expected={'passfile': NO_CLIENT_FILE,
                        'sslcert': NO_CLIENT_FILE,
                        'sslkey': NO_CLIENT_FILE})),
        ('Server mode uses the user\'s own password file',
         dict(params={'passfile': '/.pgpass'},
              expected={'passfile': '.pgpass',
                        'sslcert': NO_CLIENT_FILE,
                        'sslkey': NO_CLIENT_FILE})),
        ('Server mode passes on a configured file that does not exist',
         dict(params={'sslcert': '/missing.crt', 'sslkey': '/missing.key',
                      'sslrootcert': '/missing-root.crt',
                      'sslcrl': '/missing.crl'},
              expected={'passfile': NO_CLIENT_FILE,
                        'sslcert': 'missing.crt',
                        'sslkey': 'missing.key',
                        'sslrootcert': 'missing-root.crt',
                        'sslcrl': 'missing.crl'})),
        ('Server mode passes on a CRL directory',
         dict(params={'sslcrldir': '/crls'},
              expected={'sslcrldir': 'crls'})),
        ('Server mode leaves the trust settings to libpq if unset',
         dict(params={'sslmode': 'verify-full'},
              absent=('sslrootcert', 'sslcrl', 'sslcrldir'))),
        ('Server mode leaves a root certificate of "system" alone',
         dict(params={'sslrootcert': 'system'},
              expected={'sslrootcert': 'system'})),
        ('Desktop mode leaves libpq to find its own files',
         dict(params={}, server_mode=False, absent=CREDENTIAL_FILES)),
        ('Desktop mode drops a configured file that does not exist',
         dict(params={'sslcert': '/missing.crt'}, server_mode=False,
              absent=CREDENTIAL_FILES)),
    ]

    server_mode = True
    expected = {}
    absent = ()

    def runTest(self):
        dsn, display = self._connection_string(self.params, self.server_mode)

        for key, value in self.expected.items():
            if value not in (NO_CLIENT_FILE, 'system'):
                # Expected files are given relative to the storage
                # directory, and resolved as get_complete_file_path() returns
                # them: the short (8.3) form with forward slashes on Windows,
                # unchanged on POSIX.
                value = fs_short_path(
                    os.path.join(self.storage, value)).replace('\\', '/')
            self.assertEqual(dsn.get(key), value, key)
        for key in self.absent:
            self.assertNotIn(key, dsn)

        # The display string shows what the user configured, not the
        # placeholder.
        self.assertNotIn(NO_CLIENT_FILE, display.values())


class SubscriptionConnectionClientFilesTestCase(_StorageMixin,
                                                BaseTestGenerator):
    """The direct connection made to look up a publisher's publications
    names every credential file in server mode, as above."""

    scenarios = [
        ('Server mode', dict(server_mode=True)),
        ('Desktop mode', dict(server_mode=False)),
    ]

    def runTest(self):
        connect = MagicMock()
        patches = self._mode(self.server_mode)
        with self.app.test_request_context(), \
                patch.object(psycopg3_driver.psycopg.Connection, 'connect',
                             connect):
            for p in patches:
                p.start()
            try:
                psycopg3_driver.Driver.get_connection(
                    MagicMock(), 0, database='postgres', host='127.0.0.1',
                    user='alice', port=5432, passfile=None,
                    sslmode='prefer', sslcert=None, sslkey=None,
                    sslrootcert=None, sslcompression=False)
            finally:
                for p in reversed(patches):
                    p.stop()

        params = connect.call_args.kwargs
        for key in CREDENTIAL_FILES:
            self.assertEqual(params[key],
                             NO_CLIENT_FILE if self.server_mode else None,
                             key)


class AmbientPasswordFileTestCase(_StorageMixin, BaseTestGenerator):
    """Connect through the real libpq with a password file in the home
    directory that would let the connection in: server mode must not use
    it, and desktop mode, which shows the test is sound, must."""

    scenarios = [
        ('Server mode ignores the service account\'s ~/.pgpass',
         dict(server_mode=True)),
        ('Desktop mode uses the account\'s ~/.pgpass',
         dict(server_mode=False)),
    ]

    def runTest(self):
        server = self.server
        home = os.path.join(self.storage, 'home')
        os.makedirs(home)
        pgpass = os.path.join(home, '.pgpass')

        manager = self._manager({'sslmode': server.get('sslmode', 'prefer')})
        manager.host = server['host']
        manager.port = server['port']

        def connection_string(server_mode):
            patches = self._mode(server_mode)
            with self.app.test_request_context():
                for p in patches:
                    p.start()
                try:
                    return manager.create_connection_string(
                        server['db'], server['username'])
                finally:
                    for p in reversed(patches):
                        p.stop()

        def connect(dsn):
            """Connect with no password source but the home directory's
            ~/.pgpass, returning (connection, error text)."""
            with patch.dict(os.environ, {'HOME': home}):
                for var in ('PGPASSWORD', 'PGPASSFILE', 'PGSERVICE'):
                    os.environ.pop(var, None)
                try:
                    return psycopg.connect(dsn, connect_timeout=10), ''
                except psycopg.OperationalError as e:
                    return None, str(e)

        # Probe, before ~/.pgpass exists, whether the server asks for a
        # password at all: with trust or certificate authentication a
        # connection succeeds with nothing to supply, which says nothing
        # about whether ~/.pgpass was used.
        probe_dsn = connection_string(True)
        if 'passfile' not in conninfo_to_dict(probe_dsn):
            probe_dsn = make_conninfo(probe_dsn, passfile=NO_CLIENT_FILE)
        probe, probe_error = connect(probe_dsn)
        if probe is not None:
            probe.close()
            self.skipTest('The test server does not ask for a password '
                          '(trust or certificate authentication)')
        if 'no password supplied' not in probe_error:
            self.skipTest('The test server cannot be checked for a '
                          'password this way: {0}'.format(probe_error))

        with open(pgpass, 'w') as f:
            f.write('*:*:*:*:{0}\n'.format(
                server['db_password'].replace('\\', '\\\\')
                .replace(':', '\\:')))
        os.chmod(pgpass, 0o600)

        conn, error = connect(connection_string(self.server_mode))

        if conn is not None:
            conn.close()
        if self.server_mode:
            self.assertIsNone(conn, 'connected using ~/.pgpass')
            self.assertIn('no password supplied', error)
        elif conn is None:
            self.skipTest('The test server does not ask for a password, or '
                          'cannot be reached this way: {0}'.format(error))
