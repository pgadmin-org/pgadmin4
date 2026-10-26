##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""In server mode, libpq is told to refuse GSSAPI and SSPI, and GSSAPI
encryption, for a connection that may not use Kerberos, as the environment
variables that isolate Kerberos credentials do not stop Windows SSPI or
gssproxy. Desktop mode is unchanged."""

import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import psycopg
from psycopg.conninfo import conninfo_to_dict

import config
from flask import session
from pgadmin.utils.constants import INTERNAL, KERBEROS
from pgadmin.utils.locker import KerberosNotAllowed
from pgadmin.utils.route import BaseTestGenerator

import pgadmin.utils.driver.psycopg3.server_manager as server_manager
from pgadmin.utils.driver.psycopg3.connection import Connection

USER_CACHE = 'FILE:/tmp/pgadmin_cache_alice'

# The libpq that parses a connection string is the one installed, which may
# be older than 16 and then rejects require_auth. So most scenarios use a
# stand-in for make_conninfo, which does not validate; only one uses the
# real parser, and it needs libpq 16 or later.
LIBPQ_HAS_REQUIRE_AUTH = psycopg.pq.version() >= 160000


def _fake_make_conninfo(conninfo='', **kwargs):
    """A deterministic stand-in for psycopg's make_conninfo: key=value
    pairs of the keyword arguments that are not None."""
    return ' '.join('{0}={1}'.format(k, v) for k, v in kwargs.items()
                    if v is not None)


def _parse_fake(conninfo):
    return dict(item.split('=', 1) for item in conninfo.split(' ') if item)


def _login(source, ccache=USER_CACHE):
    session['auth_source_manager'] = {'current_source': source}
    if ccache:
        session['KRB5CCNAME'] = ccache


class ConnectionStringKerberosTestCase(BaseTestGenerator):
    """The connection string refuses GSSAPI and SSPI where Kerberos may
    not be used, merged with the server's own require_auth."""

    scenarios = [
        ('An internal user is refused GSSAPI and SSPI',
         dict(params={},
              expected={'require_auth': '!gss,!sspi',
                        'gssencmode': 'disable'})),
        ('Negated methods of the server are kept',
         dict(params={'require_auth': '!password'},
              expected={'require_auth': '!password,!gss,!sspi',
                        'gssencmode': 'disable'})),
        ('Accepted methods of the server lose GSSAPI',
         dict(params={'require_auth': 'scram-sha-256,gss'},
              expected={'require_auth': 'scram-sha-256',
                        'gssencmode': 'disable'})),
        ('A server accepting only GSSAPI and SSPI is refused',
         dict(params={'require_auth': 'gss,sspi'}, error=True)),
        ('A Kerberos user connecting with Kerberos has only SSPI refused',
         dict(source=KERBEROS, kerberos_conn=True, params={},
              expected={'require_auth': '!sspi'},
              absent=('gssencmode',))),
        ('A Kerberos user on a server without Kerberos is as any other',
         dict(source=KERBEROS, kerberos_conn=False, params={},
              expected={'require_auth': '!gss,!sspi',
                        'gssencmode': 'disable'})),
        ('A Kerberos user connecting with Kerberos is forced to GSSAPI',
         dict(source=KERBEROS, kerberos_conn=True, libpq=150000, params={},
              expected={'gsslib': 'gssapi'},
              absent=('require_auth', 'gssencmode'))),
        ('A Kerberos user\'s own gsslib is overridden with GSSAPI',
         dict(source=KERBEROS, kerberos_conn=True, libpq=150000,
              params={'gsslib': 'sspi'}, expected={'gsslib': 'gssapi'})),
        ('A Kerberos user\'s utility string has gsslib overridden',
         dict(source=KERBEROS, kerberos_conn=True, libpq=150000,
              for_utility=True, params={'gsslib': 'sspi'},
              expected={'gsslib': 'gssapi'})),
        ('No gsslib is added where Kerberos is refused',
         dict(libpq=150000, params={}, expected={'gssencmode': 'disable'},
              absent=('gsslib',))),
        ('Desktop mode changes nothing',
         dict(server_mode=False, params={},
              absent=('require_auth', 'gssencmode'))),
        ('An old libpq has only GSSAPI encryption disabled',
         dict(libpq=150000, params={}, expected={'gssencmode': 'disable'},
              absent=('require_auth',))),
        ('A utility string does not get require_auth',
         dict(for_utility=True, params={},
              absent=('require_auth', 'gssencmode'))),
        ('A utility string has the server\'s require_auth changed',
         dict(for_utility=True,
              params={'require_auth': 'scram-sha-256,gss'},
              expected={'require_auth': 'scram-sha-256'},
              absent=('gssencmode',))),
        ('The user\'s gssencmode does not apply',
         dict(params={'gssencmode': 'require'},
              expected={'require_auth': '!gss,!sspi',
                        'gssencmode': 'disable'})),
        ('The user\'s gssencmode does not apply with an old libpq',
         dict(libpq=150000, params={'gssencmode': 'require'},
              expected={'gssencmode': 'disable'},
              absent=('require_auth',))),
        ('The real libpq parser accepts the connection string',
         dict(real_parser=True, params={'require_auth': '!password'},
              expected={'require_auth': '!password,!gss,!sspi',
                        'gssencmode': 'disable'})),
    ]

    server_mode = True
    source = INTERNAL
    kerberos_conn = False
    libpq = 160000
    for_utility = False
    real_parser = False
    expected = {}
    absent = ()

    def setUp(self):
        # Filesystem-only tests: skip BaseTestGenerator's server setup.
        unittest.TestCase.setUp(self)
        self.storage = os.path.realpath(
            tempfile.mkdtemp(prefix='pga_kerberos_conninfo_'))

    def tearDown(self):
        shutil.rmtree(self.storage, ignore_errors=True)

    def runTest(self):
        # Any scenario that puts require_auth into the connection string needs
        # a libpq that knows it: create_connection_string() validates the
        # string, and a real_parser scenario parses it, with the installed
        # libpq, which before 16 rejects require_auth. Only the connection
        # parameter version is mocked per scenario, not the installed libpq.
        produces_require_auth = (
            self.real_parser or
            getattr(self, 'error', False) or
            'require_auth' in self.expected or
            'require_auth' in self.params
        )
        if produces_require_auth and not LIBPQ_HAS_REQUIRE_AUTH:
            self.skipTest('The installed libpq cannot parse require_auth.')

        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.host = '127.0.0.1'
        manager.port = 5432
        manager.use_ssh_tunnel = False
        manager.service = None
        manager.connection_params = dict(self.params)
        manager.kerberos_conn = self.kerberos_conn

        patches = [
            patch.dict(self.app.config, {'SERVER_MODE': self.server_mode}),
            patch.object(config, 'SERVER_MODE', self.server_mode),
            patch.object(self.app, 'PGADMIN_RUNTIME', False),
            patch('pgadmin.utils.get_storage_directory',
                  return_value=self.storage),
            patch('pgadmin.utils.locker.libpq_version',
                  return_value=self.libpq),
        ]
        if not self.real_parser:
            patches.append(patch.object(
                server_manager, 'make_conninfo', _fake_make_conninfo))
        with self.app.test_request_context():
            for p in patches:
                p.start()
            try:
                _login(self.source)
                if getattr(self, 'error', False):
                    with self.assertRaises(PermissionError) as cm:
                        manager.create_connection_string(
                            'postgres', 'alice',
                            for_utility=self.for_utility)
                    self.assertIn('require_auth', str(cm.exception))
                    # The display string is still built.
                    self.assertTrue(manager.display_connection_string)
                    return
                dsn = manager.create_connection_string(
                    'postgres', 'alice', for_utility=self.for_utility)
            finally:
                for p in reversed(patches):
                    p.stop()

        for conninfo in (dsn, manager.display_connection_string):
            values = conninfo_to_dict(conninfo) if self.real_parser \
                else _parse_fake(conninfo)
            for key, value in self.expected.items():
                self.assertEqual(values.get(key), value, key)
            for key in self.absent:
                self.assertNotIn(key, values)


class ConnectKerberosNotAllowedTestCase(BaseTestGenerator):
    """A server whose require_auth allows only GSSAPI or SSPI, for a
    connection that may not use them, is reported by Connection.connect()
    as a failed connection with the message, not as an exception."""

    scenarios = [('KerberosNotAllowed is a failed connection', dict())]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        message = 'require_auth allows only GSSAPI or SSPI'
        manager = MagicMock(use_ssh_tunnel=0, kerberos_conn=False,
                            passexec=None, password=None)
        manager.get_connection_param_value.return_value = None
        manager.create_connection_string.side_effect = \
            KerberosNotAllowed(message)

        conn = Connection.__new__(Connection)
        conn.conn = None
        conn.manager = manager
        conn.db = 'postgres'
        conn.conn_id = 'test'
        conn.password = None
        conn.reconnecting = False
        conn.async_ = 0

        with patch('pgadmin.utils.driver.psycopg3.connection.'
                   'get_crypt_key', return_value=(True, 'key')), \
                patch.object(config, 'SERVER_MODE', True), \
                self.app.test_request_context():
            status, msg = conn.connect()

        self.assertFalse(status)
        self.assertEqual(msg, message)
        manager.stop_ssh_tunnel.assert_called_once()
