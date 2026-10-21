##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for pgAdmin OAuth integration in the Psycopg 3 connection."""

import unittest
from contextlib import ExitStack, nullcontext
from unittest.mock import AsyncMock, MagicMock, patch
from pgadmin.utils.route import BaseTestGenerator

import psycopg
from flask import Flask

from pgadmin.utils import pg_oauth2
import pgadmin.utils.driver.psycopg3.connection as connection_module

ISSUER = 'https://keycloak.example.test/realms/postgres'


class _OAuthUnitTestMixin:
    """Run each OAuth unit test as a separate regression scenario."""

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

        cls.scenarios = [
            (name[5:], {'case_method': name})
            for name in sorted(dir(cls))
            if name.startswith('case_') and callable(getattr(cls, name))
        ]

    def setUp(self):
        # These tests mock database connections.
        unittest.TestCase.setUp(self)

    def runTest(self):
        getattr(self, self.case_method)()


class TestOAuthConnection(
        _OAuthUnitTestMixin, BaseTestGenerator):
    """Test pgAdmin OAuth handling during Psycopg connection creation."""

    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            SECRET_KEY='connection-oauth-unit-test-secret',
            TESTING=True,
        )

        self.token_handle = pg_oauth2._oauth_token.set(None)

    def tearDown(self):
        pg_oauth2._oauth_token.reset(self.token_handle)

    @staticmethod
    def _make_manager(mode='disabled', client_id=None, oauth_scope=None):
        manager = MagicMock()

        manager.sid = 1
        manager.db = 'postgres'
        manager.user = 'database-user'
        manager.password = None
        manager.role = None

        manager.use_ssh_tunnel = 0
        manager.tunnel_created = False
        manager.kerberos_conn = False

        manager.passexec = None
        manager.prepare_threshold = None

        manager.connection_params = {
            'oauth_pgadmin_token_mode': mode,
            'oauth_issuer': ISSUER,
        }

        if client_id is not None:
            manager.connection_params['oauth_client_id'] = client_id
        if oauth_scope is not None:
            manager.connection_params['oauth_scope'] = oauth_scope

        manager.get_connection_param_value.return_value = None
        manager.create_connection_string.return_value = (
            'host=database.example.test '
            'dbname=postgres '
            'user=database-user'
        )

        return manager

    @staticmethod
    def _make_connection(manager, async_=False):
        # Construct the object without invoking Connection.__init__().
        # Its constructor obtains unrelated global driver state that is
        # not part of these tests.
        connection = object.__new__(connection_module.Connection)

        connection.manager = manager
        connection.conn_id = 'DB:postgres'
        connection.db = 'postgres'
        connection.conn = None

        connection.password = None
        connection.reconnecting = False
        connection.wasConnected = False
        connection.async_ = 1 if async_ else 0

        # Connection initialization executes several SQL statements.
        # These tests stop at the Psycopg connection boundary.
        connection._initialize = MagicMock(
            return_value=(True, None)
        )

        return connection

    @staticmethod
    def _make_psycopg_connection():
        pg_connection = MagicMock()
        pg_connection.closed = False
        return pg_connection

    @staticmethod
    def _apply_common_patches(stack):
        stack.enter_context(
            patch.object(
                connection_module,
                'get_crypt_key',
                return_value=(True, 'crypt-key')
            )
        )
        stack.enter_context(
            patch.object(
                connection_module,
                'get_complete_file_path',
                return_value=None
            )
        )
        stack.enter_context(
            patch.object(
                connection_module,
                'ConnectionLocker',
                return_value=nullcontext()
            )
        )
        stack.enter_context(
            patch.object(
                connection_module,
                'gettext',
                side_effect=lambda message, *args, **kwargs: message
            )
        )
        stack.enter_context(
            patch.object(
                connection_module,
                '_',
                side_effect=lambda message, *args, **kwargs: message
            )
        )

    def case_oauth_disabled_does_not_access_pgadmin_token(self):
        """
        Existing non-OAuth connections must not install the OAuth hook
        or access the pgAdmin OAuth session.
        """
        manager = self._make_manager(mode='disabled')
        connection = self._make_connection(manager)
        pg_connection = self._make_psycopg_connection()

        def connect_without_oauth(*args, **kwargs):
            self.assertIsNone(pg_oauth2._oauth_token.get())
            return pg_connection

        with self.app.test_request_context('/'):
            with ExitStack() as stack:
                self._apply_common_patches(stack)

                install_hook = stack.enter_context(
                    patch.object(
                        connection_module,
                        'install_oauth_hook'
                    )
                )
                get_token = stack.enter_context(
                    patch.object(
                        connection_module,
                        'get_postgres_oauth_token'
                    )
                )
                psycopg_connect = stack.enter_context(
                    patch.object(
                        connection_module.psycopg.Connection,
                        'connect',
                        side_effect=connect_without_oauth
                    )
                )

                with pg_oauth2.oauth_token_context('outer-token'):
                    status, message = connection.connect()

                    self.assertEqual(
                        pg_oauth2._oauth_token.get(),
                        'outer-token',
                    )

        self.assertTrue(status)
        self.assertIsNone(message)

        install_hook.assert_not_called()
        get_token.assert_not_called()
        psycopg_connect.assert_called_once()

        connection._initialize.assert_called_once()
        manager.create_connection_string.assert_called_once_with(
            'postgres',
            'database-user',
            None
        )

    def case_oauth_enabled_without_token_returns_error(self):
        """
        An OAuth-enabled server must fail clearly before calling
        Psycopg when the pgAdmin session has no access token.
        """
        manager = self._make_manager(mode='direct')
        connection = self._make_connection(manager)

        with self.app.test_request_context('/'):
            with ExitStack() as stack:
                self._apply_common_patches(stack)

                install_hook = stack.enter_context(
                    patch.object(
                        connection_module,
                        'install_oauth_hook'
                    )
                )
                get_token = stack.enter_context(
                    patch.object(
                        connection_module,
                        'get_postgres_oauth_token',
                        side_effect=pg_oauth2.OAuthTokenError(
                            'No current pgAdmin OAuth access token'
                            ' is available. Sign in to pgAdmin again.'
                        )
                    )
                )
                psycopg_connect = stack.enter_context(
                    patch.object(
                        connection_module.psycopg.Connection,
                        'connect'
                    )
                )

                status, message = connection.connect()

        self.assertFalse(status)
        self.assertEqual(
            message,
            'No current pgAdmin OAuth access token '
            'is available. Sign in to pgAdmin again.'
        )

        get_token.assert_called_once_with('direct', None, None, ISSUER)
        psycopg_connect.assert_not_called()
        connection._initialize.assert_not_called()
        manager.stop_ssh_tunnel.assert_called_once_with()

    def case_sync_connection_is_created_inside_token_context(self):
        """
        The synchronous Psycopg connection must be created while the
        pgAdmin access token is present in the ContextVar.
        """
        manager = self._make_manager(mode='direct')
        connection = self._make_connection(manager)
        pg_connection = self._make_psycopg_connection()

        def connect_with_oauth(*args, **kwargs):
            self.assertEqual(
                pg_oauth2._oauth_token.get(),
                'pgadmin-access-token'
            )
            return pg_connection

        with self.app.test_request_context('/'):
            with ExitStack() as stack:
                self._apply_common_patches(stack)

                install_hook = stack.enter_context(
                    patch.object(
                        connection_module,
                        'install_oauth_hook'
                    )
                )
                get_token = stack.enter_context(
                    patch.object(
                        connection_module,
                        'get_postgres_oauth_token',
                        return_value='pgadmin-access-token'
                    )
                )
                psycopg_connect = stack.enter_context(
                    patch.object(
                        connection_module.psycopg.Connection,
                        'connect',
                        side_effect=connect_with_oauth
                    )
                )

                status, message = connection.connect()

        self.assertTrue(status)
        self.assertIsNone(message)
        self.assertIsNone(pg_oauth2._oauth_token.get())

        install_hook.assert_called_once_with()
        get_token.assert_called_once_with('direct', None, None, ISSUER)
        psycopg_connect.assert_called_once()

        connection._initialize.assert_called_once()
        self.assertIs(connection.conn, pg_connection)

    def case_async_connection_is_created_inside_token_context(self):
        """
        The asynchronous Psycopg connection must inherit the token
        context while asyncio.run() executes the connection coroutine.
        """
        manager = self._make_manager(mode='direct')
        connection = self._make_connection(
            manager,
            async_=True
        )
        pg_connection = self._make_psycopg_connection()

        async def connect_with_oauth(*args, **kwargs):
            self.assertEqual(
                pg_oauth2._oauth_token.get(),
                'pgadmin-access-token'
            )
            return pg_connection

        async_connect = AsyncMock(
            side_effect=connect_with_oauth
        )

        with self.app.test_request_context('/'):
            with ExitStack() as stack:
                self._apply_common_patches(stack)

                install_hook = stack.enter_context(
                    patch.object(
                        connection_module,
                        'install_oauth_hook'
                    )
                )
                get_token = stack.enter_context(
                    patch.object(
                        connection_module,
                        'get_postgres_oauth_token',
                        return_value='pgadmin-access-token'
                    )
                )
                stack.enter_context(
                    patch.object(
                        connection_module.psycopg.AsyncConnection,
                        'connect',
                        new=async_connect
                    )
                )

                status, message = connection.connect()

        self.assertTrue(status)
        self.assertIsNone(message)
        self.assertIsNone(pg_oauth2._oauth_token.get())

        install_hook.assert_called_once_with()
        get_token.assert_called_once_with('direct', None, None, ISSUER)
        async_connect.assert_awaited_once()

        connection._initialize.assert_called_once()
        self.assertIs(connection.conn, pg_connection)
        self.assertIs(
            pg_connection.server_cursor_factory,
            connection_module.AsyncDictServerCursor
        )

    def case_token_context_is_restored_after_connection_failure(self):
        """
        A Psycopg failure must not leave the failed connection's token
        available to later libpq callbacks.
        """
        manager = self._make_manager(mode='direct')
        connection = self._make_connection(manager)

        def fail_inside_oauth_context(*args, **kwargs):
            self.assertEqual(
                pg_oauth2._oauth_token.get(),
                'pgadmin-access-token'
            )
            raise psycopg.OperationalError(
                'test connection failure'
            )

        with self.app.test_request_context('/'):
            with ExitStack() as stack:
                self._apply_common_patches(stack)

                stack.enter_context(
                    patch.object(
                        connection_module,
                        'install_oauth_hook'
                    )
                )
                get_token = stack.enter_context(
                    patch.object(
                        connection_module,
                        'get_postgres_oauth_token',
                        return_value='pgadmin-access-token'
                    )
                )
                psycopg_connect = stack.enter_context(
                    patch.object(
                        connection_module.psycopg.Connection,
                        'connect',
                        side_effect=fail_inside_oauth_context
                    )
                )

                status, message = connection.connect()

        self.assertFalse(status)
        self.assertIn('test connection failure', message)
        self.assertIsNone(pg_oauth2._oauth_token.get())

        get_token.assert_called_once_with('direct', None, None, ISSUER)
        psycopg_connect.assert_called_once()
        connection._initialize.assert_not_called()
        self.assertIsNone(connection.conn)

    def case_exchange_mode_passes_client_id(self):
        """
        Token exchange mode must pass the configured OAuth client ID
        when obtaining the PostgreSQL token.
        """
        manager = self._make_manager(
            mode='exchange',
            client_id='postgres-cluster',
            oauth_scope='openid',
        )
        connection = self._make_connection(manager)
        pg_connection = self._make_psycopg_connection()

        def connect_with_exchanged_token(*args, **kwargs):
            self.assertEqual(
                pg_oauth2._oauth_token.get(),
                'exchanged-token'
            )
            return pg_connection

        with self.app.test_request_context('/'):
            with ExitStack() as stack:
                self._apply_common_patches(stack)

                install_hook = stack.enter_context(
                    patch.object(
                        connection_module,
                        'install_oauth_hook'
                    )
                )
                get_token = stack.enter_context(
                    patch.object(
                        connection_module,
                        'get_postgres_oauth_token',
                        return_value='exchanged-token'
                    )
                )
                psycopg_connect = stack.enter_context(
                    patch.object(
                        connection_module.psycopg.Connection,
                        'connect',
                        side_effect=connect_with_exchanged_token
                    )
                )

                status, message = connection.connect()

        self.assertTrue(status)
        self.assertIsNone(message)

        install_hook.assert_called_once_with()
        get_token.assert_called_once_with(
            'exchange',
            'postgres-cluster',
            'openid',
            ISSUER,
        )
        psycopg_connect.assert_called_once()
        connection._initialize.assert_called_once()

    def case_missing_connection_params_uses_non_oauth_path(self):
        """
        A connection manager without connection parameters must behave as a
        normal non-OAuth connection.
        """
        manager = self._make_manager()
        manager.connection_params = None

        connection = self._make_connection(manager)
        pg_connection = self._make_psycopg_connection()

        def connect_without_oauth(*args, **kwargs):
            self.assertIsNone(pg_oauth2._oauth_token.get())
            return pg_connection

        with self.app.test_request_context('/'):
            with ExitStack() as stack:
                self._apply_common_patches(stack)

                install_hook = stack.enter_context(
                    patch.object(
                        connection_module,
                        'install_oauth_hook'
                    )
                )
                get_token = stack.enter_context(
                    patch.object(
                        connection_module,
                        'get_postgres_oauth_token'
                    )
                )
                psycopg_connect = stack.enter_context(
                    patch.object(
                        connection_module.psycopg.Connection,
                        'connect',
                        side_effect=connect_without_oauth
                    )
                )

                status, message = connection.connect()

        self.assertTrue(status)
        self.assertIsNone(message)

        install_hook.assert_not_called()
        get_token.assert_not_called()
        psycopg_connect.assert_called_once()

        self.assertIs(connection.conn, pg_connection)
        connection._initialize.assert_called_once()

    @patch.object(connection_module, 'install_oauth_hook')
    @patch.object(connection_module, 'get_postgres_oauth_token')
    @patch.object(connection_module.psycopg, 'connect')
    def case_reset_creates_connection_inside_token_context(
            self, psycopg_connect, get_token, install_hook):
        manager = self._make_manager(
            mode='exchange',
            client_id='postgres-cluster',
            oauth_scope='openid',
        )
        connection = self._make_connection(manager)
        connection._decrypt_password = MagicMock(
            return_value=(True, '', None),
        )

        pg_connection = self._make_psycopg_connection()
        pg_connection.info.backend_pid = 23456
        get_token.return_value = 'exchanged-token'

        def connect_with_token(*args, **kwargs):
            self.assertEqual(
                pg_oauth2._oauth_token.get(),
                'exchanged-token',
            )
            return pg_connection

        psycopg_connect.side_effect = connect_with_token

        with self.app.test_request_context('/'):
            with ExitStack() as stack:
                self._apply_common_patches(stack)

                with pg_oauth2.oauth_token_context('outer-token'):
                    status, message = connection.reset()

                    self.assertEqual(
                        pg_oauth2._oauth_token.get(),
                        'outer-token',
                    )

        self.assertTrue(status)
        self.assertIsNone(message)
        self.assertIs(connection.conn, pg_connection)
        self.assertIsNone(pg_oauth2._oauth_token.get())

        install_hook.assert_called_once_with()
        get_token.assert_called_once_with(
            'exchange',
            'postgres-cluster',
            'openid',
            ISSUER,
        )
        psycopg_connect.assert_called_once_with(
            manager.create_connection_string.return_value,
            cursor_factory=connection_module.DictCursor,
        )

    @patch.object(connection_module, 'install_oauth_hook')
    @patch.object(connection_module, 'get_postgres_oauth_token')
    @patch.object(connection_module.psycopg, 'connect')
    def case_cancel_creates_connection_inside_token_context(
            self, psycopg_connect, get_token, install_hook):
        manager = self._make_manager(
            mode='exchange',
            client_id='postgres-cluster',
            oauth_scope='openid',
        )
        connection = self._make_connection(manager)

        connection._Connection__backend_pid = 12345
        manager.connection.return_value = connection

        pg_connection = self._make_psycopg_connection()
        get_token.return_value = 'exchanged-token'

        def connect_with_token(*args, **kwargs):
            self.assertEqual(
                pg_oauth2._oauth_token.get(),
                'exchanged-token',
            )
            return pg_connection

        psycopg_connect.side_effect = connect_with_token

        with self.app.test_request_context('/'):
            with ExitStack() as stack:
                self._apply_common_patches(stack)

                with pg_oauth2.oauth_token_context('outer-token'):
                    status, message = connection.cancel_transaction(
                        connection.conn_id,
                    )

                    self.assertEqual(
                        pg_oauth2._oauth_token.get(),
                        'outer-token',
                    )

        self.assertTrue(status, message)
        self.assertIsNone(pg_oauth2._oauth_token.get())

        install_hook.assert_called_once_with()
        get_token.assert_called_once_with(
            'exchange',
            'postgres-cluster',
            'openid',
            ISSUER,
        )
        psycopg_connect.assert_called_once_with(
            manager.create_connection_string.return_value,
            cursor_factory=connection_module.DictCursor,
        )
        pg_connection.cursor.return_value.execute.assert_called_once_with(
            'SELECT pg_cancel_backend(12345);',
        )
        pg_connection.close.assert_called_once_with()

    def case_auxiliary_connections_handle_oauth_token_errors(self):
        cases = (
            ('reset', pg_oauth2.OAuthTokenError),
            ('reset', pg_oauth2.OAuthRequestContextRequired),
            ('cancel', pg_oauth2.OAuthTokenError),
            ('cancel', pg_oauth2.OAuthRequestContextRequired),
        )

        for operation, error_type in cases:
            with self.subTest(
                    operation=operation,
                    error_type=error_type.__name__):
                manager = self._make_manager(
                    mode='exchange',
                    client_id='postgres-cluster',
                    oauth_scope='openid',
                )
                connection = self._make_connection(manager)
                connection._decrypt_password = MagicMock(
                    return_value=(True, '', None),
                )
                connection._Connection__backend_pid = 12345
                manager.connection.return_value = connection

                error_message = 'OAuth credentials unavailable.'

                with self.app.test_request_context('/'):
                    with ExitStack() as stack:
                        self._apply_common_patches(stack)

                        install_hook = stack.enter_context(
                            patch.object(
                                connection_module,
                                'install_oauth_hook',
                            )
                        )
                        get_token = stack.enter_context(
                            patch.object(
                                connection_module,
                                'get_postgres_oauth_token',
                                side_effect=error_type(error_message),
                            )
                        )
                        psycopg_connect = stack.enter_context(
                            patch.object(
                                connection_module.psycopg,
                                'connect',
                            )
                        )

                        if operation == 'reset':
                            status, message = connection.reset()
                        else:
                            status, message = (
                                connection.cancel_transaction(
                                    connection.conn_id,
                                )
                            )

                self.assertFalse(status)
                self.assertEqual(message, error_message)
                self.assertIsNone(pg_oauth2._oauth_token.get())

                install_hook.assert_called_once_with()
                get_token.assert_called_once_with(
                    'exchange',
                    'postgres-cluster',
                    'openid',
                    ISSUER,
                )
                psycopg_connect.assert_not_called()

