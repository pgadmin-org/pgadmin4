##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Connecting to a server with the ``entra`` authentication method.

Only the outer boundaries are faked: the identity provider's token
endpoint, the OAuth2 login in the session and the psycopg connection. The
token that reaches psycopg is the one the identity provider issued
On-Behalf-Of the user's pgAdmin login, delivered as the password."""

import base64
import time
from contextlib import contextmanager
from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs

from flask import session

import pgadmin.utils.driver.psycopg3.connection as connection_module
from pgadmin.utils import pg_oauth2
from pgadmin.utils.driver.psycopg3.tests.test_connection_token_auth import \
    TokenAuthConnectionTest

ISSUER = 'https://login.example.test/tenant-id/v2.0'
TOKEN_ENDPOINT = 'https://login.example.test/tenant-id/oauth2/v2.0/token'
LOGIN_TOKEN = 'the-pgadmin-login-access-token'
OBO_TOKEN = 'the-azure-postgres-access-token'
POSTGRES_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default'
PROVIDER = 'entra'


def _response(status_code=200, body=None):
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = body
    response.__enter__.return_value = response
    response.__exit__.return_value = False
    return response


class _LoginApp:
    """The Flask app, with the OAuth2 login in every request's session."""

    def __init__(self, app, token_data):
        self.app = app
        self.token_data = token_data

    @contextmanager
    def test_request_context(self, *args, **kwargs):
        with self.app.test_request_context(*args, **kwargs):
            session['oauth2_provider'] = PROVIDER
            if self.token_data is not None:
                session['oauth2_token'] = dict(self.token_data)
            yield


class EntraConnectionTest(TokenAuthConnectionTest):
    """Every case runs for each operation that opens a connection."""

    scenarios = [
        ('{0} on {1}'.format(name[5:].replace('_', ' '), operation),
         {'case_method': name, 'operation': operation})
        for name in (
            'case_the_obo_token_is_the_password',
            'case_the_obo_request_is_authenticated_by_pgadmin',
            'case_the_obo_endpoint_comes_from_the_issuer_metadata',
            'case_every_connection_gets_a_new_obo_token',
            'case_the_server_must_verify_its_identity',
            'case_the_login_provider_must_enable_obo',
            'case_interaction_required_asks_to_sign_in_again',
            'case_an_expired_login_asks_to_sign_in_again',
            'case_other_identity_provider_errors_do_not_ask_to_sign_in',
            'case_no_token_reaches_an_error_message',
        ) for operation in ('connect', 'async_connect', 'reset', 'cancel')
    ]

    def setUp(self):
        super().setUp()
        self.idp_response = _response(200, {
            'access_token': OBO_TOKEN, 'token_type': 'Bearer'})
        self.login = {'access_token': LOGIN_TOKEN,
                      'expires_at': time.time() + 3600}
        self.provider_config = {'OAUTH2_ENTRA_OBO_ENABLED': True}
        self.client = MagicMock()
        self.client.client_id = 'pgadmin-app-id'
        self.client.client_secret = 'pgadmin-app-secret'
        self.client.access_token_url = None
        self.client.client_kwargs = {'verify': True}
        self.client.load_server_metadata.return_value = {
            'issuer': ISSUER, 'token_endpoint': TOKEN_ENDPOINT}
        self.real_app = self.app

    def _manager(self, auth_method='entra'):
        manager = super()._manager(auth_method)
        manager.connection_params = {'sslmode': 'verify-full'}
        return manager

    def _run(self, manager):
        self.app = _LoginApp(self.real_app, self.login)
        source = MagicMock()
        source.oauth2_config = {PROVIDER: self.provider_config}
        source.oauth2_clients = {PROVIDER: self.client}
        with patch('pgadmin.authenticate.get_auth_sources',
                   return_value=source), \
                patch.object(pg_oauth2.requests, 'post',
                             return_value=self.idp_response) as post:
            self.post = post
            return super()._run(manager)

    def case_the_obo_token_is_the_password(self):
        manager = self._manager()

        with patch.object(pg_oauth2, 'install_oauth_hook',
                          side_effect=RuntimeError('not libpq 18')):
            status, message, target, seen, _ = self._run(manager)

        self.assertTrue(status, message)
        self.assertEqual(self._passwords(manager), [OBO_TOKEN])
        # Password delivery: no OAUTHBEARER token and no libpq 18 check.
        self.assertIsNone(seen['oauth_token'])
        target.assert_called_once()

    def case_the_obo_request_is_authenticated_by_pgadmin(self):
        manager = self._manager()

        self._run(manager)

        self.post.assert_called_once()
        args, kwargs = self.post.call_args
        # The token endpoint of the login provider's tenant.
        self.assertEqual(args[0], TOKEN_ENDPOINT)
        self.assertEqual(kwargs['data'], {
            'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion': LOGIN_TOKEN,
            'scope': POSTGRES_SCOPE,
            'requested_token_use': 'on_behalf_of',
        })
        self.assertTrue(kwargs['verify'])
        self.assertFalse(kwargs['allow_redirects'])
        prepared = pg_oauth2.requests.Request(
            'POST', args[0], data=kwargs['data'],
            headers=kwargs['headers'], auth=kwargs['auth']).prepare()
        credentials = base64.b64encode(
            b'pgadmin-app-id:pgadmin-app-secret').decode('ascii')
        self.assertEqual(prepared.headers['Authorization'],
                         'Basic ' + credentials)
        body = prepared.body
        if isinstance(body, bytes):
            body = body.decode('utf-8')
        self.assertEqual(parse_qs(body)['assertion'], [LOGIN_TOKEN])

    def case_the_obo_endpoint_comes_from_the_issuer_metadata(self):
        # A configured access_token_url must not redirect the assertion.
        self.client.access_token_url = 'https://other.example.test/token'
        manager = self._manager()

        status, message, *_ = self._run(manager)

        self.assertTrue(status, message)
        self.assertEqual(self.post.call_args[0][0], TOKEN_ENDPOINT)

    def case_every_connection_gets_a_new_obo_token(self):
        manager = self._manager()

        self._run(manager)
        self.idp_response.json.return_value = {
            'access_token': 'second-token', 'token_type': 'Bearer'}
        self._run(manager)

        self.assertEqual(self._passwords(manager),
                         [OBO_TOKEN, 'second-token'])

    def case_the_server_must_verify_its_identity(self):
        for params in ({}, {'sslmode': 'require'},
                       {'sslmode': 'verify-ca'}, {'sslmode': 'prefer'}):
            manager = self._manager()
            manager.connection_params = params

            status, message, target, *_ = self._run(manager)

            self.assertFalse(status)
            self.assertIn('verify-full', message)
            # The token is neither requested nor sent.
            self.post.assert_not_called()
            target.assert_not_called()

    def case_the_login_provider_must_enable_obo(self):
        for config in ({}, {'OAUTH2_ENTRA_OBO_ENABLED': False}):
            self.provider_config = config
            manager = self._manager()

            status, message, target, *_ = self._run(manager)

            self.assertFalse(status)
            self.assertIn('OAUTH2_ENTRA_OBO_ENABLED', message)
            self.post.assert_not_called()
            target.assert_not_called()

    def _assert_sign_in_again(self, connection, status, target):
        self.assertFalse(status)
        self.assertTrue(connection.sign_in_again)
        target.assert_not_called()

    def case_interaction_required_asks_to_sign_in_again(self):
        for error in ('interaction_required', 'invalid_grant',
                      'consent_required'):
            self.idp_response = _response(400, {
                'error': error, 'error_description': 'AADSTS50076 ...'})
            manager = self._manager()

            status, message, target, _, connection = self._run(manager)

            self._assert_sign_in_again(connection, status, target)
            self.assertIn(error, message)

    def case_an_expired_login_asks_to_sign_in_again(self):
        # Expired, and no refresh token to renew it with.
        self.login = {'access_token': LOGIN_TOKEN,
                      'expires_at': time.time() - 60}
        manager = self._manager()

        status, message, target, _, connection = self._run(manager)

        self._assert_sign_in_again(connection, status, target)
        self.post.assert_not_called()

    def case_other_identity_provider_errors_do_not_ask_to_sign_in(self):
        self.idp_response = _response(400, {'error': 'invalid_scope'})
        manager = self._manager()

        status, message, target, _, connection = self._run(manager)

        self.assertFalse(status)
        self.assertFalse(connection.sign_in_again)
        self.assertIn('invalid_scope', message)
        target.assert_not_called()

    def case_no_token_reaches_an_error_message(self):
        # Neither the login token nor the issued one may leak, even when
        # the identity provider echoes them.
        self.idp_response = _response(400, {
            'error': 'invalid_request',
            'error_description': 'bad assertion ' + LOGIN_TOKEN,
            'access_token': OBO_TOKEN})
        manager = self._manager()

        with patch.object(connection_module, 'current_app') as app:
            status, message, *_ = self._run(manager)

        self.assertFalse(status)
        logged = repr(app.logger.mock_calls)
        for text in (message, logged):
            self.assertNotIn(LOGIN_TOKEN, text)
            self.assertNotIn(OBO_TOKEN, text)
