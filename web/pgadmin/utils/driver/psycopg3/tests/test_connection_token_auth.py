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
connect, async connect, reset and cancel. A token delivered as the password
is used for that connection only and does not depend on libpq 18 or on the
psycopg implementation."""

import unittest
from contextlib import ExitStack
from unittest.mock import AsyncMock, MagicMock, patch

from flask import Flask

import pgadmin.utils.driver.psycopg3.connection as connection_module
from pgadmin.utils import pg_oauth2, token_auth
from pgadmin.utils.driver.psycopg3.tests.test_connection_oauth import \
    TestOAuthConnection
from pgadmin.utils.route import BaseTestGenerator

METHOD = 'test_password_token'
LIBPQ_ERROR = 'This test libpq is not version 18.'
OPERATIONS = ('connect', 'async_connect', 'reset', 'cancel')


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
            'case_a_password_server_never_asks_for_a_token',
            'case_an_unregistered_method_is_refused',
        ) for operation in OPERATIONS
    ]

    def setUp(self):
        # These tests mock database connections.
        unittest.TestCase.setUp(self)
        self.app = Flask(__name__)
        self.app.config.update(SECRET_KEY='unit-test', TESTING=True)
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
        return manager

    def _run(self, manager):
        """Run the operation; return status, message, the mock of the
        psycopg call it makes, the token context seen by that call and the
        connection."""
        async_ = self.operation == 'async_connect'
        connection = TestOAuthConnection._make_connection(
            manager, async_=async_)
        connection._decrypt_password = MagicMock(
            return_value=(True, '', None))
        connection._Connection__backend_pid = 12345
        manager.connection.return_value = connection
        pg = TestOAuthConnection._make_psycopg_connection()
        pg.info.backend_pid = 23456

        seen = {}

        def record(*args, **kwargs):
            seen['oauth_token'] = pg_oauth2._oauth_token.get()
            return pg

        async def arecord(*args, **kwargs):
            return record()

        with self.app.test_request_context('/'), ExitStack() as stack:
            TestOAuthConnection._apply_common_patches(stack)
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

            if self.operation in ('connect', 'async_connect'):
                status, message = connection.connect()
            elif self.operation == 'reset':
                status, message = connection.reset()
            else:
                status, message = connection.cancel_transaction(
                    connection.conn_id)

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
        # The SSH tunnel does not outlive a connect that failed on a token.
        if self.operation in ('connect', 'async_connect'):
            manager.stop_ssh_tunnel.assert_called_once_with()

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
