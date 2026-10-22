##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
"""Tests for Microsoft sign-in and PostgreSQL token acquisition."""

import datetime
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from flask import Flask, session

from pgadmin.utils import entra_auth
from pgadmin.browser.server_groups.servers import (
    ServerModule, ServerNode, prepare_auth_method_data, require_entra_ssl)
from pgadmin.utils.driver.psycopg3 import connection as connection_module
from pgadmin.utils.driver.psycopg3.connection import Connection
from pgadmin.utils.driver.psycopg3.server_manager import ServerManager
from pgadmin.tools.sqleditor import entra_signin_challenge


class TestEntraPassword(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.secret_key = 'test-only'
        self.app.session_interface.manager = Mock()
        self.context = self.app.test_request_context()
        self.context.push()
        self.user = Mock(id=42, is_authenticated=True)
        self.user_patch = patch.object(entra_auth, 'current_user', self.user)
        self.user_patch.start()
        self.config_patches = [
            patch.object(entra_auth.config, 'ENTRA_DB_AUTH_ENABLED', True),
            patch.object(entra_auth.config, 'ENTRA_DB_TENANT_ID', None),
            patch.object(entra_auth.config, 'ENTRA_DB_SIGNIN_METHOD',
                         'device_code'),
        ]
        for config_patch in self.config_patches:
            config_patch.start()
        self.password = entra_auth.EntraPassword(
            'test.postgres.database.azure.com', None, {})

    def tearDown(self):
        for config_patch in reversed(self.config_patches):
            config_patch.stop()
        self.user_patch.stop()
        self.context.pop()

    @patch.object(entra_auth, 'DeviceCodeCredential')
    def test_sign_in_stores_account_record_and_shows_code(
            self, credential_class):
        def authenticate(**kwargs):
            callback = credential_class.call_args.kwargs['prompt_callback']
            callback('https://microsoft.com/devicelogin', 'CODE-123',
                     datetime.datetime.now(datetime.timezone.utc))
            self.assertEqual(session['entra_db_code']['user_code'],
                             'CODE-123')
            self.app.session_interface.manager.put.assert_called_once()
            return Mock(username='user@example.com',
                        serialize=lambda: 'account-record')

        credential_class.return_value.authenticate.side_effect = authenticate
        self.assertEqual(entra_auth.start_sign_in(), 'user@example.com')
        self.assertEqual(session['entra_db_auth'], {
            'record': 'account-record', 'method': 'device_code'})
        self.assertNotIn('entra_db_code', session)
        credential_class.return_value.authenticate.assert_called_once_with(
            scopes=[entra_auth.POSTGRES_SCOPE])

    @patch.object(entra_auth, 'AuthenticationRecord')
    @patch.object(entra_auth, 'DeviceCodeCredential')
    def test_uses_signed_in_account_to_get_database_token(
            self, credential_class, record_class):
        session['entra_db_auth'] = {
            'record': 'account-record', 'method': 'device_code'}
        credential_class.return_value.get_token.return_value = Mock(
            token='database-token')
        self.assertEqual(self.password.get(), 'database-token')
        record_class.deserialize.assert_called_once_with('account-record')
        credential_class.return_value.get_token.assert_called_once_with(
            entra_auth.POSTGRES_SCOPE)
        self.assertTrue(credential_class.call_args.kwargs[
            'disable_automatic_authentication'])

    @patch.object(entra_auth, 'InteractiveBrowserCredential')
    def test_browser_sign_in_needs_no_device_code(self, credential_class):
        credential_class.return_value.authenticate.return_value = Mock(
            username='user@example.com', serialize=lambda: 'browser-record')
        with patch.object(entra_auth.config, 'ENTRA_DB_SIGNIN_METHOD',
                          'browser'):
            self.assertEqual(entra_auth.start_sign_in(), 'user@example.com')
        self.assertNotIn('entra_db_code', session)
        self.assertEqual(session['entra_db_auth']['method'], 'browser')

    @patch.object(entra_auth, 'AuthenticationRecord')
    @patch.object(entra_auth, 'InteractiveBrowserCredential')
    def test_browser_connection_refreshes_from_its_own_cache(
            self, credential_class, record_class):
        session['entra_db_auth'] = {
            'record': 'browser-record', 'method': 'browser'}
        credential_class.return_value.get_token.return_value = Mock(
            token='database-token')
        self.assertEqual(self.password.get(), 'database-token')
        record_class.deserialize.assert_called_once_with('browser-record')
        credential_class.return_value.get_token.assert_called_once_with(
            entra_auth.POSTGRES_SCOPE)

    @patch.object(entra_auth, 'DeviceCodeCredential')
    def test_requires_sign_in_before_connection(self, credential_class):
        with self.assertRaisesRegex(entra_auth.EntraAuthenticationError,
                                    'Sign in to Microsoft'):
            self.password.get()
        credential_class.assert_not_called()

    @patch.object(entra_auth, 'DeviceCodeCredential')
    def test_destination_override_is_rejected_before_token_request(
            self, credential_class):
        for host, service, params in (
                ('attacker.example', None, {}),
                ('attacker.example,test.postgres.database.azure.com',
                 None, {}),
                ('test.postgres.database.azure.com', 'other', {}),
                ('test.postgres.database.azure.com', None,
                 {'hostaddr': '127.0.0.1'}),
                ('test.postgres.database.azure.com', None,
                 {'passfile': '/tmp/other.pass'})):
            with self.subTest(host=host, params=params):
                with self.assertRaises(entra_auth.EntraAuthenticationError):
                    entra_auth.EntraPassword(host, service, params).get()
        credential_class.assert_not_called()


class TestEntraServerSettings(unittest.TestCase):
    def test_expired_token_requests_sign_in_instead_of_password(self):
        app = Flask(__name__)
        with app.test_request_context():
            server = SimpleNamespace(id=7, name='Azure test',
                                     username='user@example.com',
                                     auth_method='entra')
            response = ServerNode.get_response_for_password(
                None, server, 428, errmsg='Sign in again.')
        self.assertEqual(response.status_code, 428)
        self.assertTrue(response.json['result']['prompt_entra'])
        self.assertNotIn('prompt_password', response.json['result'])

    def test_query_tool_requests_sign_in_instead_of_password(self):
        app = Flask(__name__)
        with app.test_request_context():
            server = SimpleNamespace(id=7, name='Azure test',
                                     username='user@example.com')
            response = entra_signin_challenge(server, 'Sign in again.')
        self.assertEqual(response.status_code, 428)
        self.assertTrue(response.json['result']['prompt_entra'])

    def test_restoring_connections_tolerates_new_query_tool_connection(self):
        manager = Mock(use_ssh_tunnel=0)
        connection = Mock(wasConnected=True, auto_reconnect=True)
        manager.connections = {'existing': connection}
        connection.connect.side_effect = lambda: manager.connections.update(
            {'query-tool': Mock(wasConnected=False, auto_reconnect=False)})
        ServerManager._restore_connections(manager)
        connection.connect.assert_called_once_with()

    def test_query_tool_connection_accepts_no_password_field(self):
        password, encpass, update_password = \
            Connection._check_user_password(None, {
                'user': 'user@example.com', 'encpass': None})
        self.assertIsNone(password)
        self.assertIsNone(encpass)
        self.assertTrue(update_password)

    def test_password_connection_still_uses_supplied_password(self):
        password, encpass, update_password = \
            Connection._check_user_password(None, {
                'user': 'test_admin', 'password': 'test-only-password'})
        self.assertEqual(password, 'test-only-password')
        self.assertIsNone(encpass)
        self.assertFalse(update_password)

    @patch.object(connection_module.psycopg, 'connect')
    @patch.object(connection_module, 'ConnectionLocker')
    def test_cancel_transaction_uses_a_fresh_entra_token(
            self, locker_class, connect):
        manager = Mock(auth_method='entra', password=None,
                       kerberos_conn=False, user='user@example.com',
                       passexec=Mock(get=Mock(return_value='database-token')))
        cancel_connection = Mock()
        cancel_connection._Connection__backend_pid = 42
        manager.connection.return_value = cancel_connection
        manager.create_connection_string.return_value = 'token-dsn'
        pg_connection = Mock()
        connect.return_value = pg_connection
        connection = Connection(manager, 'connection-id', 'postgres')
        connection._Connection__backend_pid = 42

        status, message = connection.cancel_transaction('connection-id')

        self.assertTrue(status)
        self.assertEqual(message, '')
        manager.passexec.get.assert_called_once_with()
        manager.create_connection_string.assert_called_once_with(
            'postgres', 'user@example.com', 'database-token')
        connect.assert_called_once_with(
            'token-dsn', cursor_factory=connection_module.DictCursor)

    @patch.object(connection_module.psycopg, 'connect')
    @patch.object(connection_module, 'ConnectionLocker')
    def test_cancel_transaction_returns_signin_error_when_token_is_unavailable(
            self, locker_class, connect):
        auth_error = entra_auth.EntraAuthenticationError(
            'Sign in to Microsoft again.')
        manager = Mock(auth_method='entra', password=None,
                       kerberos_conn=False,
                       passexec=Mock(get=Mock(side_effect=auth_error)))
        cancel_connection = Mock()
        cancel_connection._Connection__backend_pid = 42
        manager.connection.return_value = cancel_connection
        connection = Connection(manager, 'connection-id', 'postgres')
        connection._Connection__backend_pid = 42

        status, message = connection.cancel_transaction('connection-id')

        self.assertFalse(status)
        self.assertEqual(message, 'Sign in to Microsoft again.')
        connect.assert_not_called()

    def test_sign_in_routes_are_exposed_to_the_browser(self):
        endpoints = ServerModule(__name__).get_exposed_url_endpoints()
        self.assertIn('NODE-server.entra_signin', endpoints)
        self.assertIn('NODE-server.entra_signin_code', endpoints)

    def test_switching_to_entra_clears_password_fields(self):
        with patch.object(entra_auth.config, 'SERVER_MODE', True), \
                patch.object(entra_auth.config, 'ENTRA_DB_AUTH_ENABLED', True):
            data, error = prepare_auth_method_data(
                {'auth_method': 'entra'}, Mock(auth_method='password'))
        self.assertIsNone(error)
        self.assertIsNone(data['password'])
        self.assertFalse(data['save_password'])
        self.assertIsNone(data['passexec_name'])

    def test_entra_rejects_a_password(self):
        with patch.object(entra_auth.config, 'SERVER_MODE', True), \
                patch.object(entra_auth.config, 'ENTRA_DB_AUTH_ENABLED', True):
            _, error = prepare_auth_method_data({
                'auth_method': 'entra', 'password': 'hidden-password'})
        self.assertIn('cannot use', error)

    def test_entra_requires_verified_tls(self):
        self.assertEqual(require_entra_ssl({'sslmode': 'disable'})['sslmode'],
                         'verify-full')
