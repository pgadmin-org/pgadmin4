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

import psycopg
from flask import Flask

from pgadmin.utils import pg_oauth2
import pgadmin.utils.driver.psycopg3.connection as connection_module


class TestOAuthConnection(unittest.TestCase):
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
    def _make_manager(mode='disabled', client_id=None):
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
        }

        if client_id is not None:
            manager.connection_params['oauth_client_id'] = client_id

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

    def test_oauth_disabled_does_not_access_pgadmin_token(self):
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

                status, message = connection.connect()

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

    def test_oauth_enabled_without_token_returns_error(self):
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

        install_hook.assert_not_called()
        get_token.assert_called_once_with('direct', None)
        psycopg_connect.assert_not_called()
        connection._initialize.assert_not_called()

    def test_sync_connection_is_created_inside_token_context(self):
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
        get_token.assert_called_once_with('direct', None)
        psycopg_connect.assert_called_once()

        connection._initialize.assert_called_once()
        self.assertIs(connection.conn, pg_connection)

    def test_async_connection_is_created_inside_token_context(self):
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
        get_token.assert_called_once_with('direct', None)
        async_connect.assert_awaited_once()

        connection._initialize.assert_called_once()
        self.assertIs(connection.conn, pg_connection)
        self.assertIs(
            pg_connection.server_cursor_factory,
            connection_module.AsyncDictServerCursor
        )

    def test_token_context_is_restored_after_connection_failure(self):
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

        get_token.assert_called_once_with('direct', None)
        psycopg_connect.assert_called_once()
        connection._initialize.assert_not_called()
        self.assertIsNone(connection.conn)

    def test_exchange_mode_passes_client_id(self):
        """
        Token exchange mode must pass the configured OAuth client ID
        when obtaining the PostgreSQL token.
        """
        manager = self._make_manager(
            mode='exchange', client_id='postgres-cluster')
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
        get_token.assert_called_once_with('exchange', 'postgres-cluster')
        psycopg_connect.assert_called_once()
        connection._initialize.assert_called_once()

    def test_missing_connection_params_uses_non_oauth_path(self):
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


if __name__ == '__main__':
    unittest.main()
