##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""The driver asks the token authentication registry for the server's
token provider and token delivery wherever it opens a physical connection:
connect, async connect and reset. A token delivered as the password is used
for that connection only and does not depend on libpq 18 or on the psycopg
implementation. Cancelling a query asks for no token at all."""

import threading
import unittest
from contextlib import ExitStack
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from flask import Flask
from flask_babel import Babel

import pgadmin.utils.driver.psycopg3.connection as connection_module
from pgadmin.utils import pg_oauth2, token_auth
from pgadmin.utils.driver.psycopg3.tests.test_connection_oauth import \
    TestOAuthConnection
from pgadmin.utils.route import BaseTestGenerator

METHOD = 'test_password_token'
LIBPQ_ERROR = 'This test libpq is not version 18.'
OPERATIONS = ('connect', 'async_connect', 'reset')


class _Provider:
    """A token provider that hands out a new token on every call."""

    def __init__(self, error=None):
        self.error = error
        self.calls = []

    def __call__(self, connection_params):
        self.calls.append(dict(connection_params))
        if self.error:
            raise self.error
        return 'token-{0}'.format(len(self.calls))


class TrackingLock:
    """A lock that tells when another thread is waiting to acquire it, so a
    test knows that thread reached the lock instead of guessing from how
    long it ran."""

    def __init__(self):
        self._lock = threading.Lock()
        self._waiting = threading.Event()

    def acquire(self):
        if not self._lock.acquire(blocking=False):
            self._waiting.set()
            self._lock.acquire()

    def release(self):
        self._lock.release()

    def locked(self):
        return self._lock.locked()

    def wait_for_waiter(self, timeout=10):
        return self._waiting.wait(timeout)

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, *exc):
        self.release()


class TokenAuthConnectionTest(BaseTestGenerator):
    """Every case runs for each operation that opens a connection."""

    scenarios = [
        ('{0} on {1}'.format(name[5:].replace('_', ' '), operation),
         {'case_method': name, 'operation': operation})
        for name in (
            'case_password_delivery_sends_the_token_as_the_password',
            'case_password_delivery_token_is_not_kept',
            'case_every_physical_connection_gets_a_fresh_token',
            'case_bearer_delivery_scopes_the_token_and_sends_no_password',
            'case_bearer_delivery_enforces_the_libpq_checks',
            'case_token_errors_reach_no_server',
            'case_a_token_error_stops_only_a_tunnel_nothing_else_uses',
            'case_a_password_server_never_asks_for_a_token',
            'case_an_unregistered_method_is_refused',
            'case_the_token_is_obtained_before_the_kerberos_lock',
            'case_settings_changed_during_the_token_request_are_refused',
            'case_a_method_changed_while_a_password_attempt_waits_is_refused',
            'case_a_connection_opened_during_an_update_is_not_published',
            'case_a_connection_opened_while_update_releases_is_not_published',
            'case_no_update_comes_between_the_check_and_the_build',
        ) for operation in OPERATIONS
    ]

    def setUp(self):
        # These tests mock database connections.
        unittest.TestCase.setUp(self)
        self.app = Flask(__name__)
        self.app.config.update(SECRET_KEY='unit-test', TESTING=True)
        # The checks of a method translate their error messages.
        Babel(self.app)
        self.provider = _Provider()
        self.registered = []

    def tearDown(self):
        for name in self.registered:
            token_auth.unregister_token_auth_method(name)

    def runTest(self):
        getattr(self, self.case_method)()

    def _register(self, delivery, provider=None, name=METHOD):
        token_auth.register_token_auth_method(
            name, provider or self.provider, delivery)
        self.registered.append(name)

    @staticmethod
    def _manager(auth_method=METHOD):
        manager = TestOAuthConnection._make_manager()
        manager.auth_method = auth_method
        manager.connection_params = {'sslmode': 'verify-full', 'x': '1'}
        manager.password = None
        manager.settings_generation = 0
        return manager

    def _run(self, manager, locker=None, start=None):
        """Run the operation; return status, message, the mock of the
        psycopg call it makes, the token context seen by that call and the
        connection. start, when given, is called with the connection and a
        function that runs the operation, and calls that function."""
        async_ = self.operation == 'async_connect'
        connection = TestOAuthConnection._make_connection(
            manager, async_=async_)
        connection._decrypt_password = MagicMock(
            return_value=(True, '', None))
        connection._Connection__backend_pid = 12345
        manager.connection.return_value = connection
        pg = TestOAuthConnection._make_psycopg_connection()
        pg.info.backend_pid = 23456

        if async_:
            pg.close = AsyncMock()
        seen = {'pg': pg}

        def record(*args, **kwargs):
            seen['oauth_token'] = pg_oauth2._oauth_token.get()
            if getattr(self, 'on_open', None) is not None:
                self.on_open()
            return pg

        async def arecord(*args, **kwargs):
            return record()

        with self.app.test_request_context('/'), ExitStack() as stack:
            TestOAuthConnection._apply_common_patches(stack)
            if locker is not None:
                stack.enter_context(patch.object(
                    connection_module, 'ConnectionLocker',
                    return_value=locker))
            if self.operation == 'connect':
                target = stack.enter_context(patch.object(
                    connection_module.psycopg.Connection, 'connect',
                    side_effect=record))
            elif self.operation == 'async_connect':
                target = stack.enter_context(patch.object(
                    connection_module.psycopg.AsyncConnection, 'connect',
                    new=AsyncMock(side_effect=arecord)))
            else:
                target = stack.enter_context(patch.object(
                    connection_module.psycopg, 'connect',
                    side_effect=record))

            result = []

            def go():
                if self.operation in ('connect', 'async_connect'):
                    result.append(connection.connect())
                elif self.operation == 'reset':
                    result.append(connection.reset())
                else:
                    result.append(connection.cancel_transaction(
                        connection.conn_id))

            (start or (lambda _, run: run()))(connection, go)
            status, message = result[0]

        self.assertIsNone(pg_oauth2._oauth_token.get())
        return status, message, target, seen, connection

    @staticmethod
    def _passwords(manager):
        return [c.args[2] for c in
                manager.create_connection_string.call_args_list]

    def case_password_delivery_sends_the_token_as_the_password(self):
        self._register(token_auth.PasswordDelivery())
        manager = self._manager()

        with patch.object(pg_oauth2, 'install_oauth_hook',
                          side_effect=RuntimeError(LIBPQ_ERROR)) as install:
            status, message, target, seen, _ = self._run(manager)

        self.assertTrue(status, message)
        # The token is the password of this connection and nothing else:
        # no libpq 18 hook and no OAUTHBEARER token.
        self.assertEqual(self._passwords(manager), ['token-1'])
        install.assert_not_called()
        self.assertIsNone(seen['oauth_token'])
        target.assert_called_once()
        # The provider got the server's connection parameters.
        self.assertEqual(self.provider.calls,
                         [{'sslmode': 'verify-full', 'x': '1'}])

    def case_the_token_is_obtained_before_the_kerberos_lock(self):
        # Getting a token may mean a request to the identity provider,
        # which must not hold up the connections waiting on the lock; the
        # token is only delivered inside it.
        events = []

        class Locker:
            def __enter__(self):
                events.append('lock')
                return self

            def __exit__(self, *exc):
                events.append('unlock')

        def provider(connection_params):
            events.append('token')
            return 'token-x'

        def connection_string(database, user, password):
            events.append(('connect', password))
            return 'dbname=x'

        self._register(token_auth.PasswordDelivery(), provider)
        manager = self._manager()
        manager.create_connection_string.side_effect = connection_string

        status, message, _, _, _ = self._run(manager, locker=Locker())

        self.assertTrue(status, message)
        self.assertEqual(
            events, ['token', 'lock', ('connect', 'token-x'), 'unlock'])

    def case_password_delivery_token_is_not_kept(self):
        self._register(token_auth.PasswordDelivery())
        manager = self._manager()

        status, message, _, _, connection = self._run(manager)

        self.assertTrue(status, message)
        self.assertIsNone(connection.password)
        self.assertIsNone(manager.password)

    def case_every_physical_connection_gets_a_fresh_token(self):
        self._register(token_auth.PasswordDelivery())
        manager = self._manager()

        self._run(manager)
        self._run(manager)

        self.assertEqual(self._passwords(manager), ['token-1', 'token-2'])
        self.assertEqual(len(self.provider.calls), 2)

    def case_bearer_delivery_scopes_the_token_and_sends_no_password(self):
        self._register(token_auth.OAuthBearerDelivery())
        manager = self._manager()

        with patch.object(pg_oauth2, 'install_oauth_hook') as install:
            status, message, _, seen, _ = self._run(manager)

        self.assertTrue(status, message)
        install.assert_called_once_with()
        self.assertEqual(seen['oauth_token'], 'token-1')
        self.assertEqual(self._passwords(manager), [None])

    def case_bearer_delivery_enforces_the_libpq_checks(self):
        self._register(token_auth.OAuthBearerDelivery())
        manager = self._manager()

        with patch.object(pg_oauth2, 'install_oauth_hook',
                          side_effect=RuntimeError(LIBPQ_ERROR)):
            status, message, target, *_ = self._run(manager)

        self.assertFalse(status)
        self.assertEqual(message, LIBPQ_ERROR)
        target.assert_not_called()

    def case_token_errors_reach_no_server(self):
        error = pg_oauth2.OAuthTokenError('No login token.')
        self._register(token_auth.PasswordDelivery(),
                       _Provider(error=error))
        manager = self._manager()

        status, message, target, *_ = self._run(manager)

        self.assertFalse(status)
        self.assertEqual(message, 'No login token.')
        target.assert_not_called()

    def case_a_token_error_stops_only_a_tunnel_nothing_else_uses(self):
        # The SSH tunnel this connect created does not outlive it, but one
        # it reused stays up for the connections still using it.
        if self.operation == 'reset':
            return
        error = pg_oauth2.OAuthTokenError('No login token.')
        self._register(token_auth.PasswordDelivery(),
                       _Provider(error=error))
        for created, live, stopped in ((False, False, True),
                                       (True, False, False),
                                       (True, True, False),
                                       (False, True, False)):
            manager = self._manager()
            manager.use_ssh_tunnel = 1
            manager.tunnel_created = created
            manager.create_ssh_tunnel.return_value = (True, None)
            manager.has_live_connection.return_value = live

            status, *_ = self._run(manager)

            self.assertFalse(status)
            self.assertEqual(manager.stop_ssh_tunnel.called, stopped,
                             (created, live))

    def case_settings_changed_during_the_token_request_are_refused(self):
        # A manager.update() from another request while the token is being
        # requested must not have the token sent to a destination that was
        # never checked.
        changes = (
            ('host', 'elsewhere.example.com'),
            ('connection_params', {'sslmode': 'verify-full',
                                   'hostaddr': '192.0.2.1'}),
            ('auth_method', 'password'),
        )
        for attr, value in changes:
            manager = self._manager()

            def provider(connection_params, manager=manager, attr=attr,
                         value=value):
                setattr(manager, attr, value)
                return 'token-x'

            self._register(token_auth.PasswordDelivery(), provider,
                           name=METHOD + '_' + attr)
            manager.auth_method = METHOD + '_' + attr

            status, message, target, *_ = self._run(manager)

            self.assertFalse(status, attr)
            self.assertIn('settings changed', message, attr)
            target.assert_not_called()
            manager.create_connection_string.assert_not_called()

    def case_a_method_changed_while_a_password_attempt_waits_is_refused(self):
        # An update() to a token method while a password attempt waits for
        # the lock must not have the attempt's password sent where the
        # token method's credential belongs.
        self._register(token_auth.PasswordDelivery())
        manager = self._manager(auth_method='password')

        class Locker:
            def __enter__(self):
                manager.auth_method = METHOD
                return self

            def __exit__(self, *exc):
                pass

        status, message, target, *_ = self._run(manager, locker=Locker())

        self.assertFalse(status)
        self.assertIn('settings changed', message)
        target.assert_not_called()
        manager.create_connection_string.assert_not_called()
        self.assertEqual(self.provider.calls, [])

    def case_a_connection_opened_during_an_update_is_not_published(self):
        # Any update() releases only the connections it finds connected
        # and forgets the rest, whatever it changed, so a connection
        # opened while it ran would stay open, never released.
        changes = (
            (METHOD, 'host', 'elsewhere.example.com'),
            (METHOD, 'port', 5433),
            (METHOD, None, None),
            ('password', 'host', 'elsewhere.example.com'),
            ('password', 'port', 5433),
            ('password', 'auth_method', METHOD),
            ('password', None, None),
        )
        for method, attr, value in changes:
            case = (method, attr)
            self._register(token_auth.PasswordDelivery())
            manager = self._manager(auth_method=method)
            manager.host = 'db.example.com'
            manager.port = 5432

            def update(manager=manager, attr=attr, value=value):
                with manager.settings_lock:
                    manager.settings_generation += 1
                    if attr:
                        setattr(manager, attr, value)
            self.on_open = update

            status, message, _, seen, connection = self._run(manager)

            self.assertFalse(status, case)
            self.assertIn('settings changed', message, case)
            seen['pg'].close.assert_called_once_with()
            self.assertIsNone(connection.conn, case)
            self.assertFalse(connection.wasConnected, case)
            token_auth.unregister_token_auth_method(METHOD)
            self.registered.remove(METHOD)

    def case_a_connection_opened_while_update_releases_is_not_published(self):
        # The real update() releases the connections of its map once it
        # gave up the settings lock; a connection of that map that opens
        # then has the new generation, but is not published outside it.
        from pgadmin.model import Server
        from pgadmin.utils.driver.psycopg3 import server_manager
        self._register(token_auth.PasswordDelivery())
        manager = self._manager()
        manager.settings_lock = threading.Lock()
        server = Server(
            id=7, user_id=1, servergroup_id=1, name='s',
            host='db.example.com', port=5432, maintenance_db='postgres',
            username='u', shared=False, auth_method=METHOD,
            connection_params=manager.connection_params)

        def start(connection, go):
            manager.connections = {connection.conn_id: connection}
            connection._release = MagicMock(side_effect=go)
            with patch.object(server_manager, 'build_passexec'):
                server_manager.ServerManager.update(manager, server)
            self.assertEqual(manager.connections, {})
            connection._release.assert_called_once_with()

        status, message, _, seen, connection = self._run(
            manager, start=start)

        self.assertEqual(manager.settings_generation, 1)
        self.assertFalse(status)
        self.assertIn('settings changed', message)
        seen['pg'].close.assert_called_once_with()
        self.assertIsNone(connection.conn)

    def case_no_update_comes_between_the_check_and_the_build(self):
        # A manager.update() that starts once the settings were compared
        # waits until the connection string is built, so the string names
        # the host that was checked; the connection it then superseded
        # while it opened is not published.
        self._register(token_auth.PasswordDelivery())
        manager = self._manager()
        manager.host = 'db.example.com'
        manager.settings_lock = TrackingLock()
        built = []
        updates = []

        def update():
            with manager.settings_lock:
                manager.settings_generation += 1
                manager.host = 'elsewhere.example.com'

        def connection_string(database, user, password):
            thread = threading.Thread(target=update)
            thread.start()
            updates.append(thread)
            # The update waits on the lock this build holds.
            self.assertTrue(manager.settings_lock.wait_for_waiter())
            built.append((manager.settings_lock.locked(), manager.host))
            return 'dbname=x'

        manager.create_connection_string.side_effect = connection_string
        # The update completes while the connection opens.
        self.on_open = lambda: updates[0].join()

        status, message, *_ = self._run(manager)

        self.assertEqual(built, [(True, 'db.example.com')])
        self.assertEqual(manager.host, 'elsewhere.example.com')
        self.assertFalse(status)
        self.assertIn('settings changed', message)

    def case_a_password_server_never_asks_for_a_token(self):
        manager = self._manager(auth_method='password')

        with patch.object(token_auth, 'get_token_auth_method') as lookup:
            status, message, *_ = self._run(manager)

        self.assertTrue(status, message)
        lookup.assert_not_called()

    def case_an_unregistered_method_is_refused(self):
        manager = self._manager(auth_method='unregistered_method')

        status, message, target, *_ = self._run(manager)

        self.assertFalse(status)
        self.assertIn('unregistered_method', message)
        target.assert_not_called()


class TokenCancelTest(BaseTestGenerator):
    """A token method cancels a query with libpq's cancel request, which
    carries no credentials, so no token is requested; this holds when a
    stale manager, such as a non-owner's after the owner of a shared server
    changed its endpoint, is released with a query running."""

    scenarios = [
        ('cancel',
         dict(release=False, error=None, from_other_connection=False)),
        ('cancel failure', dict(release=False, error='cancel refused',
                                from_other_connection=False)),
        ('cancel from another connection',
         dict(release=False, error=None, from_other_connection=True)),
        ('release of a stale manager',
         dict(release=True, error=None, from_other_connection=False)),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)
        self.app = Flask(__name__)
        self.app.config.update(SECRET_KEY='unit-test', TESTING=True)
        Babel(self.app)
        self.provider = _Provider()
        token_auth.register_token_auth_method(
            METHOD, self.provider, token_auth.PasswordDelivery())

    def tearDown(self):
        token_auth.unregister_token_auth_method(METHOD)

    def runTest(self):
        from pgadmin.utils.driver.psycopg3.server_manager import \
            ServerManager
        manager = ServerManager.__new__(ServerManager)
        manager.auth_method = METHOD
        manager.connection_params = {'sslmode': 'verify-full'}
        manager.password = None
        manager.stop_ssh_tunnel = MagicMock()
        manager.update_session = MagicMock()
        manager.create_connection_string = MagicMock()

        connection = TestOAuthConnection._make_connection(manager)
        connection.conn_id = 'CONN:query'
        connection._Connection__backend_pid = 12345
        connection.execution_aborted = False
        connection._release = MagicMock()
        pg = TestOAuthConnection._make_psycopg_connection()
        if self.error:
            pg.cancel.side_effect = connection_module.psycopg.Error(
                self.error)
        connection.conn = pg
        manager.connection = MagicMock(return_value=connection)
        manager.connections = {connection.conn_id: connection}

        with self.app.test_request_context('/'), ExitStack() as stack:
            TestOAuthConnection._apply_common_patches(stack)
            connect = stack.enter_context(patch.object(
                connection_module.psycopg, 'connect'))
            if self.release:
                manager.release()
                connection._release.assert_called_once_with()
            else:
                # Cancelled from the same connection, or from another one,
                # such as the maintenance connection, whose backend differs.
                caller = connection
                if self.from_other_connection:
                    caller = TestOAuthConnection._make_connection(manager)
                    caller._Connection__backend_pid = 999
                    caller.conn = \
                        TestOAuthConnection._make_psycopg_connection()
                    caller.execute_void = MagicMock()
                status, message = caller.cancel_transaction('query')
                self.assertEqual(status, self.error is None)
                self.assertEqual(message, self.error or '')
                if self.from_other_connection:
                    # The caller's connection, which may have to reconnect
                    # with a token, runs no pg_cancel_backend().
                    caller.execute_void.assert_not_called()
                self.assertEqual(connection.execution_aborted,
                                 self.error is None)

        pg.cancel.assert_called_once_with()
        self.assertEqual(self.provider.calls, [])
        connect.assert_not_called()
        manager.create_connection_string.assert_not_called()


class UpdateTakesTheSettingsLockTest(BaseTestGenerator):
    """ServerManager.update() changes the settings only while it holds
    the settings lock, which a token connection holds from checking them
    until its connection string is built."""

    scenarios = [('update', dict())]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        from pgadmin.model import Server
        from pgadmin.utils.driver.psycopg3 import server_manager
        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.settings_lock = TrackingLock()
        manager.connections = {}
        server = Server(
            id=7, user_id=1, servergroup_id=1, name='s',
            host='new.example.com', port=5432, maintenance_db='postgres',
            username='u', shared=False, auth_method=METHOD,
            connection_params={'sslmode': 'verify-full'})

        with patch.object(server_manager.ServerManager,
                          'create_connection_string'), \
                patch.object(server_manager.ServerManager,
                             'update_session'), \
                patch.object(server_manager, 'build_passexec'):
            with manager.settings_lock:
                thread = threading.Thread(
                    target=manager.update, args=(server,))
                thread.start()
                # update() waits on the lock, and has changed nothing.
                self.assertTrue(manager.settings_lock.wait_for_waiter())
                self.assertIsNone(getattr(manager, 'host', None))
                self.assertEqual(manager.settings_generation, 0)
            thread.join()

        self.assertEqual(manager.host, 'new.example.com')
        self.assertEqual(manager.settings_generation, 1)


class ConnectionRegisteredDuringAnUpdateTest(BaseTestGenerator):
    """A connection ServerManager.connection() registers while an update()
    runs is for the database of the settings that update() made, not of
    the ones it replaced."""

    scenarios = [('connection during update', dict())]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        from pgadmin.model import Server
        from pgadmin.utils.driver.psycopg3 import server_manager
        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.connections = {}
        manager.db = 'old_db'
        manager.db_info = {}
        manager.use_ssh_tunnel = 0
        server = Server(
            id=7, user_id=1, servergroup_id=1, name='s',
            host='db.example.com', port=5432, maintenance_db='new_db',
            username='u', shared=False, auth_method=METHOD,
            connection_params={'sslmode': 'verify-full'})
        update_ran = threading.Event()

        def crypt_key():
            # connection() has chosen the database; an update() runs
            # before it registers the connection.
            if not update_ran.is_set():
                update_ran.set()
                manager.update(server)
            return True, 'key'

        def fake_connection(mgr, conn_id, db, **kwargs):
            return SimpleNamespace(conn_id=conn_id, db=db, _release=None)

        with patch.object(server_manager.ServerManager,
                          'create_connection_string'), \
                patch.object(server_manager.ServerManager,
                             'update_session'), \
                patch.object(server_manager, 'build_passexec'), \
                patch.object(server_manager, 'get_crypt_key',
                             side_effect=crypt_key), \
                patch.object(server_manager, 'Connection',
                             side_effect=fake_connection):
            conn = manager.connection()

        self.assertEqual(manager.settings_generation, 1)
        self.assertEqual(conn.db, 'new_db')
        self.assertEqual(manager.connections, {'DB:new_db': conn})


class TokenAuthRegistryTest(BaseTestGenerator):
    """The built-in methods use the delivery they are specified to use,
    and a new method plugs in as a provider plus an existing delivery."""

    scenarios = [('registry', dict())]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        direct = token_auth.get_token_auth_method('oauth_direct')
        exchange = token_auth.get_token_auth_method('oauth_exchange')
        self.assertIsInstance(direct.delivery,
                              token_auth.OAuthBearerDelivery)
        self.assertIsInstance(exchange.delivery,
                              token_auth.OAuthBearerDelivery)
        self.assertIsNone(token_auth.get_token_auth_method('password'))

        token_auth.register_token_auth_method(
            'plugin_method', lambda params: 'x',
            token_auth.PasswordDelivery())
        try:
            plugin = token_auth.get_token_auth_method('plugin_method')
            self.assertIsInstance(plugin.delivery,
                                  token_auth.PasswordDelivery)
        finally:
            token_auth.unregister_token_auth_method('plugin_method')
        self.assertIsNone(token_auth.get_token_auth_method('plugin_method'))

        # A token is the credential, so any password is dropped: replaced
        # by the token in place of a password, and not sent with OAUTHBEARER.
        params = {'oauth_issuer': 'https://idp.example.test'}
        token_auth.register_token_auth_method(
            'plugin_password', lambda p: 'tok', token_auth.PasswordDelivery())
        try:
            with token_auth.token_connection(
                    'plugin_password', params, 'saved') as password:
                self.assertEqual(password, 'tok')
        finally:
            token_auth.unregister_token_auth_method('plugin_password')
        with patch.object(pg_oauth2, 'install_oauth_hook'), \
                patch.object(pg_oauth2, 'get_postgres_oauth_token',
                             return_value='tok'):
            with token_auth.token_connection(
                    'oauth_direct', params, 'saved') as password:
                self.assertIsNone(password)
                self.assertEqual(pg_oauth2._oauth_token.get(), 'tok')
        with token_auth.token_connection(
                'password', params, 'saved') as password:
            self.assertEqual(password, 'saved')
