##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""In server mode, libpq must never use the Kerberos credentials of the
account pgAdmin runs as: its default credential cache or client keytab.
Only a user who logged in to pgAdmin with Kerberos has credentials, the
ones delegated at login. Desktop mode is unchanged."""

import os
import unittest
from contextlib import nullcontext
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from flask import session
from psycopg.conninfo import make_conninfo, conninfo_to_dict

import config
from pgadmin.utils.constants import INTERNAL, KERBEROS
from pgadmin.utils.locker import NO_KERBEROS_CREDENTIALS, \
    ConnectionLocker, KerberosNotAllowed, apply_kerberos_conn_params, \
    isolate_kerberos_credentials, kerberos_environ, kerberos_libpq_env, \
    merge_require_auth
from pgadmin.utils.route import BaseTestGenerator

USER_CACHE = 'FILE:/tmp/pgadmin_cache_alice'
SERVICE_ACCOUNT = {'KRB5CCNAME': 'FILE:/tmp/krb5cc_service_account'}


def _login(source, ccache=USER_CACHE):
    session['auth_source_manager'] = {'current_source': source}
    if ccache:
        session['KRB5CCNAME'] = ccache


class KerberosEnvironTestCase(BaseTestGenerator):
    """kerberos_environ() gives a user's own delegated credentials to a
    Kerberos connection, and in server mode nothing else."""

    scenarios = [
        ('Desktop mode leaves the environment alone',
         dict(server_mode=False, source=KERBEROS, kerberos_conn=True,
              expected={})),
        ('An internal user has no Kerberos credentials',
         dict(source=INTERNAL, kerberos_conn=True,
              expected=NO_KERBEROS_CREDENTIALS)),
        ('A Kerberos user gets their own cache for a Kerberos connection',
         dict(source=KERBEROS, kerberos_conn=True,
              expected=dict(NO_KERBEROS_CREDENTIALS,
                            KRB5CCNAME=USER_CACHE))),
        ('A Kerberos user has none for a connection without Kerberos',
         dict(source=KERBEROS, kerberos_conn=False,
              expected=NO_KERBEROS_CREDENTIALS)),
        ('A Kerberos user without a delegated cache has none',
         dict(source=KERBEROS, kerberos_conn=True, ccache=None,
              expected=NO_KERBEROS_CREDENTIALS)),
        ('Without a request context there are none',
         dict(source=None, kerberos_conn=True,
              expected=NO_KERBEROS_CREDENTIALS)),
    ]

    server_mode = True
    ccache = USER_CACHE

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        with patch.object(config, 'SERVER_MODE', self.server_mode):
            if self.source is None:
                env = kerberos_environ(self.kerberos_conn)
            else:
                with self.app.test_request_context():
                    _login(self.source, self.ccache)
                    env = kerberos_environ(self.kerberos_conn)
        self.assertEqual(env, self.expected)


class ConnectionLockerTestCase(BaseTestGenerator):
    """Whilst a connection is made, pgAdmin's environment holds only the
    connecting user's own Kerberos credentials, if any, and afterwards
    none; never the service account's."""

    scenarios = [
        ('An internal user connects without Kerberos credentials',
         dict(source=INTERNAL, kerberos_conn=True,
              during=NO_KERBEROS_CREDENTIALS)),
        ('A Kerberos user connects with their own cache',
         dict(source=KERBEROS, kerberos_conn=True,
              during=dict(NO_KERBEROS_CREDENTIALS, KRB5CCNAME=USER_CACHE))),
        ('A Kerberos user connects without Kerberos to another server',
         dict(source=KERBEROS, kerberos_conn=False,
              during=NO_KERBEROS_CREDENTIALS)),
        ('Desktop mode keeps the service account\'s cache',
         dict(server_mode=False, source=INTERNAL, kerberos_conn=True,
              during=SERVICE_ACCOUNT, after=SERVICE_ACCOUNT)),
    ]

    server_mode = True
    after = NO_KERBEROS_CREDENTIALS

    def setUp(self):
        unittest.TestCase.setUp(self)

    @staticmethod
    def _kerberos_vars():
        return {k: os.environ[k] for k in NO_KERBEROS_CREDENTIALS
                if k in os.environ}

    def runTest(self):
        with patch.object(config, 'SERVER_MODE', self.server_mode), \
                patch.dict(os.environ, SERVICE_ACCOUNT), \
                self.app.test_request_context():
            os.environ.pop('KRB5_CLIENT_KTNAME', None)
            _login(self.source)
            with ConnectionLocker(self.kerberos_conn):
                during = self._kerberos_vars()
            after = self._kerberos_vars()

        self.assertEqual(during, self.during)
        self.assertEqual(after, self.after)
        self.assertFalse(ConnectionLocker.lock.locked())


class IsolateKerberosCredentialsTestCase(BaseTestGenerator):
    """At startup in server mode pgAdmin's environment, which libpq in its
    own process and every process it starts inherit, is pointed away from
    the service account's credentials."""

    scenarios = [
        ('Server mode', dict(server_mode=True,
                             expected=NO_KERBEROS_CREDENTIALS)),
        ('Desktop mode', dict(server_mode=False, expected=SERVICE_ACCOUNT)),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        with patch.object(config, 'SERVER_MODE', self.server_mode), \
                patch.dict(os.environ, SERVICE_ACCOUNT):
            os.environ.pop('KRB5_CLIENT_KTNAME', None)
            isolate_kerberos_credentials()
            env = {k: os.environ[k] for k in NO_KERBEROS_CREDENTIALS
                   if k in os.environ}
        self.assertEqual(env, self.expected)


class _Captured(Exception):
    pass


class BatchProcessKerberosTestCase(BaseTestGenerator):
    """A utility started by a user gets that user's Kerberos credentials,
    if they logged in with Kerberos and it connects to a server with
    Kerberos authentication enabled, and in server mode no others."""

    scenarios = [
        ('An internal user\'s utility has no Kerberos credentials',
         dict(source=INTERNAL, kerberos_conn=True,
              expected=NO_KERBEROS_CREDENTIALS)),
        ('A Kerberos user\'s utility has their own cache',
         dict(source=KERBEROS, kerberos_conn=True,
              expected=dict(NO_KERBEROS_CREDENTIALS,
                            KRB5CCNAME=USER_CACHE))),
        ('A Kerberos user\'s utility has none for a server without '
         'Kerberos',
         dict(source=KERBEROS, kerberos_conn=False,
              expected=NO_KERBEROS_CREDENTIALS)),
        ('Desktop mode keeps the service account\'s cache',
         dict(server_mode=False, source=INTERNAL, kerberos_conn=False,
              expected=SERVICE_ACCOUNT)),
    ]

    server_mode = True

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        from pgadmin.misc.bgprocess.processes import BatchProcess

        process = BatchProcess.__new__(BatchProcess)
        process.id = 'kerberos_test'
        process.log_dir = '/nonexistent'
        process.cmd = '/bin/true'
        process.args = []
        process.env = {'PGPASSWORD': 'x'}
        process.manager_obj = None
        process.check_start_end_time = MagicMock()
        captured = {}

        def capture(env):
            captured.update(env)
            raise _Captured()

        server = SimpleNamespace(service=None, connection_params={},
                                 kerberos_conn=self.kerberos_conn)

        with patch.object(config, 'SERVER_MODE', self.server_mode), \
                patch.dict(os.environ, SERVICE_ACCOUNT), \
                self.app.test_request_context():
            os.environ.pop('KRB5_CLIENT_KTNAME', None)
            _login(self.source)
            process.set_env_variables(server)
            with self.assertRaises(_Captured):
                process.start(cb=capture)

        self.assertEqual(
            {k: captured[k] for k in NO_KERBEROS_CREDENTIALS
             if k in captured}, self.expected)


class PSQLKerberosTestCase(BaseTestGenerator):
    """psql gets the user's own Kerberos credentials for a Kerberos
    connection, and in server mode none otherwise, whatever pgAdmin's
    environment holds whilst another user connects."""

    scenarios = [
        ('An internal user\'s psql has no Kerberos credentials',
         dict(source=INTERNAL, kerberos_conn=True,
              expected=NO_KERBEROS_CREDENTIALS,
              gssencmode='disable', require_auth='!gss,!sspi')),
        ('A Kerberos user\'s psql has their own cache',
         dict(source=KERBEROS, kerberos_conn=True,
              expected=dict(NO_KERBEROS_CREDENTIALS,
                            KRB5CCNAME=USER_CACHE),
              gssencmode=None, require_auth='!sspi')),
        ('A Kerberos user\'s psql has none for a server without Kerberos',
         dict(source=KERBEROS, kerberos_conn=False,
              expected=NO_KERBEROS_CREDENTIALS,
              gssencmode='disable', require_auth='!gss,!sspi')),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        from pgadmin.tools import psql
        import pgadmin.utils.driver.psycopg3.server_manager as server_manager

        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.password = None
        manager.passexec = None
        manager.user = 'alice'
        manager.kerberos_conn = self.kerberos_conn
        manager.create_connection_string = MagicMock(
            return_value='host=127.0.0.1 dbname=postgres user=alice')

        env = {}
        with patch.object(config, 'SERVER_MODE', True), \
                patch.dict(os.environ, {'KRB5CCNAME': 'FILE:/tmp/other'}), \
                self.app.test_request_context():
            _login(self.source)
            psql.get_connection_str('/usr/bin/psql', 'postgres', manager,
                                    env)
            # As get_user_env() builds it, without the per-user psqlrc.
            child_env = dict(os.environ, **env)

        self.assertEqual(
            {k: child_env[k] for k in NO_KERBEROS_CREDENTIALS
             if k in child_env}, self.expected)
        # psql runs on its own libpq, so is told what to refuse.
        manager.create_connection_string.assert_called_once_with(
            'postgres', 'alice', for_utility=True)
        self.assertEqual(env.get('PGGSSENCMODE'), self.gssencmode)
        self.assertEqual(env['PGREQUIREAUTH'], self.require_auth)


class SubscriptionConnectionKerberosTestCase(BaseTestGenerator):
    """The direct connection made to list a publisher's publications, for
    a subscription, may not use Kerberos in server mode. With libpq 16 or
    later it is told to refuse GSSAPI and SSPI, so needs no lock; with an
    older libpq it is made under the lock, so that pgAdmin's environment
    holds no other user's Kerberos credential cache whilst it is made."""

    scenarios = [
        ('libpq 16 refuses Kerberos itself',
         dict(libpq=160000, locked=False,
              expected={'gssencmode': 'disable',
                        'require_auth': '!gss,!sspi'})),
        ('libpq 15 has the lock',
         dict(libpq=150000, locked=True,
              expected={'gssencmode': 'disable'})),
        ('libpq 11 has the lock and no gssencmode',
         dict(libpq=110000, locked=True, expected={})),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        from pgadmin.utils.driver import get_driver
        import pgadmin.utils.driver.psycopg3 as psycopg3_driver

        captured = {}
        locked = []

        def connect(**kwargs):
            captured.update({k: os.environ.get(k)
                             for k in NO_KERBEROS_CREDENTIALS})
            captured['params'] = kwargs
            locked.append(ConnectionLocker.lock.locked())
            return 'connection'

        with patch.object(config, 'SERVER_MODE', True), \
                patch.dict(os.environ, {'KRB5CCNAME': USER_CACHE}), \
                patch('pgadmin.utils.locker.libpq_version',
                      return_value=self.libpq), \
                patch.object(psycopg3_driver, 'libpq_version',
                             return_value=self.libpq), \
                patch.object(psycopg3_driver.psycopg.Connection, 'connect',
                             side_effect=connect), \
                self.app.test_request_context():
            _login(INTERNAL)
            conn = get_driver(config.PG_DEFAULT_DRIVER).get_connection(
                sid=0, host='127.0.0.1', database='postgres', user='alice',
                port=5432, passfile=None, sslmode='prefer', sslcert=None,
                sslkey=None, sslrootcert=None, sslcompression=False)

        self.assertEqual(conn, 'connection')
        self.assertEqual(locked, [self.locked])
        params = captured.pop('params')
        self.assertEqual(
            {k: params[k] for k in ('gssencmode', 'require_auth')
             if k in params}, self.expected)
        if self.locked:
            self.assertEqual(captured, NO_KERBEROS_CREDENTIALS)


class MergeRequireAuthTestCase(BaseTestGenerator):
    """The server's own require_auth is combined with the methods that
    may not be used, or the connection is refused if nothing else would
    be left."""

    scenarios = [
        ('Nothing refused leaves the value alone',
         dict(value='gss', refused=(), expected='gss')),
        ('No value refuses the methods',
         dict(value=None, refused=('gss', 'sspi'),
              expected='!gss,!sspi')),
        ('An empty value refuses the methods',
         dict(value='', refused=('gss', 'sspi'), expected='!gss,!sspi')),
        ('Only commas and spaces refuses the methods',
         dict(value=' , ', refused=('gss', 'sspi'),
              expected='!gss,!sspi')),
        ('Negated methods are added to',
         dict(value='!password', refused=('gss', 'sspi'),
              expected='!password,!gss,!sspi')),
        ('A negated method already there is not repeated',
         dict(value='!sspi,!md5', refused=('gss', 'sspi'),
              expected='!sspi,!md5,!gss')),
        ('A negated method is matched whatever its case',
         dict(value='!GSS', refused=('gss', 'sspi'),
              expected='!GSS,!sspi')),
        ('Accepted methods lose those refused',
         dict(value='scram-sha-256,gss', refused=('gss', 'sspi'),
              expected='scram-sha-256')),
        ('Accepted methods are matched whatever their case',
         dict(value='SCRAM-SHA-256,GSS,Sspi', refused=('gss', 'sspi'),
              expected='SCRAM-SHA-256')),
        ('Whitespace is removed',
         dict(value=' password , gss ,, md5 ', refused=('gss', 'sspi'),
              expected='password,md5')),
        ('Whitespace in negated methods is dealt with',
         dict(value=' !password , ', refused=('gss', 'sspi'),
              expected='!password,!gss,!sspi')),
        ('Accepting only the methods refused is an error',
         dict(value='gss,sspi', refused=('gss', 'sspi'), error=True)),
        ('Accepting only GSS is an error',
         dict(value='gss', refused=('gss', 'sspi'), error=True)),
        ('Accepting GSS is fine where only SSPI is refused',
         dict(value='gss', refused=('sspi',), expected='gss')),
        ('Accepting only SSPI is an error where it is refused',
         dict(value='sspi', refused=('sspi',), error=True)),
        ('A mix of negated and accepted methods is left for libpq',
         dict(value='password,!gss', refused=('gss', 'sspi'),
              expected='password,!gss')),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        if getattr(self, 'error', False):
            with self.assertRaises(KerberosNotAllowed) as cm:
                merge_require_auth(self.value, self.refused)
            self.assertIn('require_auth', str(cm.exception))
            self.assertIsInstance(cm.exception, PermissionError)
            return
        self.assertEqual(
            merge_require_auth(self.value, self.refused), self.expected)


class ApplyKerberosConnParamsTestCase(BaseTestGenerator):
    """The libpq parameters, or environment variables, that make libpq
    refuse Kerberos for a connection that may not use it."""

    scenarios = [
        ('Desktop mode changes nothing',
         dict(server_mode=False, params={'require_auth': 'gss'},
              expected={'require_auth': 'gss'})),
        ('An internal user gets both on libpq 16',
         dict(params={},
              expected={'require_auth': '!gss,!sspi',
                        'gssencmode': 'disable'})),
        ('An old libpq gets only gssencmode',
         dict(libpq=150000, params={}, expected={'gssencmode': 'disable'})),
        ('A very old libpq gets nothing',
         dict(libpq=110000, params={}, expected={})),
        ('An old libpq has the user\'s require_auth merged',
         dict(libpq=150000, params={'require_auth': 'scram-sha-256,gss'},
              expected={'require_auth': 'scram-sha-256',
                        'gssencmode': 'disable'})),
        ('A utility connection has nothing added',
         dict(add_missing=False, params={}, expected={})),
        ('A utility connection has a user\'s values changed',
         dict(add_missing=False,
              params={'require_auth': 'scram-sha-256,gss',
                      'gssencmode': 'prefer'},
              expected={'require_auth': 'scram-sha-256',
                        'gssencmode': 'disable'})),
        ('The user\'s gssencmode is overridden',
         dict(params={'gssencmode': 'require'},
              expected={'require_auth': '!gss,!sspi',
                        'gssencmode': 'disable'})),
        ('A Kerberos user connecting with Kerberos only has SSPI refused',
         dict(source=KERBEROS, kerberos_conn=True,
              params={'gssencmode': 'require'},
              expected={'require_auth': '!sspi',
                        'gssencmode': 'require',
                        'gsslib': 'gssapi'})),
        ('A Kerberos user with a server accepting only GSS is allowed',
         dict(source=KERBEROS, kerberos_conn=True,
              params={'require_auth': 'gss'},
              expected={'require_auth': 'gss', 'gsslib': 'gssapi'})),
        ('A Kerberos user\'s gsslib is overridden with gssapi',
         dict(source=KERBEROS, kerberos_conn=True,
              params={'gsslib': 'sspi'},
              expected={'require_auth': '!sspi', 'gsslib': 'gssapi'})),
        ('A utility connection of a Kerberos user has gsslib changed',
         dict(source=KERBEROS, kerberos_conn=True, add_missing=False,
              params={'gsslib': 'sspi'},
              expected={'gsslib': 'gssapi'})),
        ('A utility connection of a Kerberos user has no gsslib added',
         dict(source=KERBEROS, kerberos_conn=True, add_missing=False,
              params={}, expected={})),
        ('No gsslib is added where Kerberos is not allowed',
         dict(source=KERBEROS, kerberos_conn=False, params={},
              expected={'require_auth': '!gss,!sspi',
                        'gssencmode': 'disable'})),
        ('The user\'s gsslib is left alone where Kerberos is refused',
         dict(params={'gsslib': 'sspi'},
              expected={'require_auth': '!gss,!sspi',
                        'gssencmode': 'disable', 'gsslib': 'sspi'})),
        ('An empty require_auth and gssencmode count as unset',
         dict(params={'require_auth': '', 'gssencmode': None},
              expected={'require_auth': '!gss,!sspi',
                        'gssencmode': 'disable'})),
        ('An empty require_auth is replaced, not merged, for Kerberos',
         dict(source=KERBEROS, kerberos_conn=True,
              params={'require_auth': None, 'gssencmode': ''},
              expected={'require_auth': '!sspi', 'gsslib': 'gssapi'})),
        ('Empty keys are dropped for an old libpq, not passed on',
         dict(libpq=110000, params={'require_auth': '', 'gssencmode': ''},
              expected={})),
        ('Empty keys are dropped for a utility string',
         dict(add_missing=False,
              params={'require_auth': None, 'gssencmode': ''},
              expected={})),
        ('A Kerberos user with a server accepting only SSPI is refused',
         dict(source=KERBEROS, kerberos_conn=True,
              params={'require_auth': 'sspi'}, error=True)),
        ('A Kerberos user on a server without Kerberos is refused GSS',
         dict(source=KERBEROS, kerberos_conn=False, params={},
              expected={'require_auth': '!gss,!sspi',
                        'gssencmode': 'disable'})),
        ('A Kerberos user without a delegated cache is refused GSS',
         dict(source=KERBEROS, kerberos_conn=True, ccache=None, params={},
              expected={'require_auth': '!gss,!sspi',
                        'gssencmode': 'disable'})),
        ('An internal user is refused GSS and an only-GSS server',
         dict(params={'require_auth': 'gss'}, error=True)),
        ('The environment is always set, as the utility has its own libpq',
         dict(libpq=110000, names=True, params={},
              expected={'PGREQUIREAUTH': '!gss,!sspi',
                        'PGGSSENCMODE': 'disable'})),
        ('The environment has the server\'s require_auth merged',
         dict(names=True, params={'PGREQUIREAUTH': '!password'},
              expected={'PGREQUIREAUTH': '!password,!gss,!sspi',
                        'PGGSSENCMODE': 'disable'})),
        ('The environment of a Kerberos connection refuses SSPI',
         dict(source=KERBEROS, kerberos_conn=True, names=True, params={},
              expected={'PGREQUIREAUTH': '!sspi',
                        'PGGSSLIB': 'gssapi'})),
        ('The environment overrides a PGGSSLIB of a Kerberos connection',
         dict(source=KERBEROS, kerberos_conn=True, names=True,
              params={'PGGSSLIB': 'sspi'},
              expected={'PGREQUIREAUTH': '!sspi', 'PGGSSLIB': 'gssapi'})),
        ('The environment has no PGGSSLIB where Kerberos is refused',
         dict(source=INTERNAL, kerberos_conn=True, names=True, params={},
              expected={'PGREQUIREAUTH': '!gss,!sspi',
                        'PGGSSENCMODE': 'disable'})),
    ]

    server_mode = True
    source = INTERNAL
    kerberos_conn = True
    ccache = USER_CACHE
    libpq = 160000
    add_missing = True

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        params = dict(self.params)
        with patch.object(config, 'SERVER_MODE', self.server_mode), \
                patch('pgadmin.utils.locker.libpq_version',
                      return_value=self.libpq), \
                self.app.test_request_context():
            _login(self.source, self.ccache)
            if getattr(self, 'names', False):
                call = kerberos_libpq_env
            else:
                def call(p, k):
                    apply_kerberos_conn_params(
                        p, k, add_missing=self.add_missing)

            if getattr(self, 'error', False):
                with self.assertRaises(KerberosNotAllowed):
                    call(params, self.kerberos_conn)
                return
            call(params, self.kerberos_conn)
        self.assertEqual(params, self.expected)


class ApplyKerberosConnParamsKeyInjectionTestCase(BaseTestGenerator):
    """make_conninfo() does not escape parameter keys, so a crafted key
    such as 'application_name=c require_auth' serialises its own
    require_auth=; libpq takes the last of a duplicated keyword. The forced
    require_auth/gssencmode must be re-inserted last so they win over any
    such smuggled value, whatever position the user's own parameter held."""

    scenarios = [
        ('A crafted key cannot override the forced parameters',
         dict(params={
             'require_auth': '!password', 'gssencmode': 'disable',
             'application_name=c require_auth': 'gss',
             'fallback_application_name=d gssencmode': 'prefer'})),
        ('A crafted key with a leading space cannot either',
         dict(params={
             'require_auth': '!password', 'gssencmode': 'disable',
             ' require_auth': 'gss', ' gssencmode': 'prefer'})),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        params = dict(self.params)
        with patch.object(config, 'SERVER_MODE', True), \
                patch('pgadmin.utils.locker.libpq_version',
                      return_value=160000), \
                self.app.test_request_context():
            _login(INTERNAL)
            apply_kerberos_conn_params(params, is_kerberos_conn=False)

        # libpq acts on the last value of a duplicated keyword, which is
        # what conninfo_to_dict() returns for the serialised string.
        effective = conninfo_to_dict(make_conninfo(**params))
        self.assertEqual(effective.get('require_auth'), '!password,!gss,!sspi')
        self.assertEqual(effective.get('gssencmode'), 'disable')


class ConnectionStringKerberosKeyInjectionTestCase(BaseTestGenerator):
    """create_connection_string() must not let a crafted parameter key steer
    the connection to GSSAPI or SSPI. In the utility string the forced values
    live in the environment (nothing is added to the string), so a smuggled
    require_auth/gssencmode/gsslib is refused; in the in-process string the
    forced value is serialised last and wins, so the safe value is what libpq
    sees. A Kerberos user can try the same with gsslib to reach SSPI.

    Such a key is never a libpq keyword, so the connection-parameter key
    validation refuses it first. The Kerberos scenarios turn that validation
    off, so that they show this check holds on its own."""

    scenarios = [
        ('A utility string with only a crafted require_auth key is refused',
         dict(source=INTERNAL, kerberos_conn=False, for_utility=True,
              params={'application_name=c require_auth': 'gss',
                      'fallback_application_name=d gssencmode': 'prefer'},
              refused=True)),
        ('The in-process string forces the safe require_auth/gssencmode',
         dict(source=INTERNAL, kerberos_conn=False, for_utility=False,
              params={'application_name=c require_auth': 'gss',
                      'fallback_application_name=d gssencmode': 'prefer'},
              expected={'require_auth': '!gss,!sspi',
                        'gssencmode': 'disable'})),
        ('A utility string with only a crafted gsslib key is refused for a '
         'Kerberos user',
         dict(source=KERBEROS, kerberos_conn=True, for_utility=True,
              params={'application_name=c gsslib': 'sspi'}, refused=True)),
        ('The in-process string forces gsslib for a Kerberos user',
         dict(source=KERBEROS, kerberos_conn=True, for_utility=False,
              params={'application_name=c gsslib': 'sspi'},
              expected={'gsslib': 'gssapi', 'require_auth': '!sspi'})),
        ('The key validation refuses a crafted key before the Kerberos check',
         dict(source=INTERNAL, kerberos_conn=False, for_utility=True,
              params={'application_name=c require_auth': 'gss'},
              key_check=True, refused=True, exc=PermissionError,
              message='Invalid connection parameter')),
    ]

    refused = False
    key_check = False
    exc = KerberosNotAllowed
    message = None

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        import pgadmin.utils.driver.psycopg3.server_manager as server_manager

        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.host = '127.0.0.1'
        manager.port = 5432
        manager.use_ssh_tunnel = False
        manager.service = None
        manager.kerberos_conn = self.kerberos_conn
        manager.connection_params = dict(self.params)

        key_check = nullcontext() if self.key_check else patch.object(
            server_manager, 'is_valid_connection_param_key',
            return_value=True)
        with patch.object(config, 'SERVER_MODE', True), \
                patch('pgadmin.utils.locker.libpq_version',
                      return_value=160000), \
                key_check, \
                self.app.test_request_context():
            _login(self.source)
            if self.refused:
                with self.assertRaises(self.exc) as cm:
                    manager.create_connection_string(
                        'postgres', 'alice', for_utility=self.for_utility)
                self.assertIsInstance(cm.exception, PermissionError)
                if self.message:
                    self.assertIn(self.message, str(cm.exception))
            else:
                dsn = manager.create_connection_string(
                    'postgres', 'alice', for_utility=self.for_utility)
                effective = conninfo_to_dict(dsn)
                for key, value in self.expected.items():
                    self.assertEqual(effective.get(key), value)
