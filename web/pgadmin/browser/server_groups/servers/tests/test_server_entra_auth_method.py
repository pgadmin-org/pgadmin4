##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""The ``entra`` server authentication method is only offered, and only
saved, in server mode when the current login provider has On-Behalf-Of
enabled; it needs sslmode=verify-full; and no database password is saved
for it."""

import json
import unittest
from unittest.mock import MagicMock, patch

import config
from pgadmin.model import Server
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils

VERIFY_FULL = {'name': 'sslmode', 'value': 'verify-full',
               'keyword': 'sslmode'}
REQUIRE = {'name': 'sslmode', 'value': 'require', 'keyword': 'sslmode'}
OBO = {'OAUTH2_ENTRA_OBO_ENABLED': True}


class ServerEntraAuthMethodTestCase(BaseTestGenerator):

    scenarios = [
        ('Create an entra server',
         dict(create={'auth_method': 'entra'}, expected_create=200)),
        ('Create an entra server on a private endpoint host name',
         dict(create={'auth_method': 'entra',
                      'host': 'pg.private.corp.example.test'},
              expected_create=200)),
        ('Create an entra server saves no password',
         dict(create={'auth_method': 'entra', 'password': 'a-token',
                      'save_password': True},
              expected_create=200, no_password=True)),
        ('Create an entra server without OBO on the login provider',
         dict(create={'auth_method': 'entra'}, provider_config={},
              expected_create=400, message='OAUTH2_ENTRA_OBO_ENABLED')),
        ('Create an entra server with OBO switched off',
         dict(create={'auth_method': 'entra'},
              provider_config={'OAUTH2_ENTRA_OBO_ENABLED': False},
              expected_create=400, message='OAUTH2_ENTRA_OBO_ENABLED')),
        ('Create an entra server without an OAuth2 login',
         dict(create={'auth_method': 'entra'}, provider=None,
              expected_create=400, message='OAUTH2_ENTRA_OBO_ENABLED')),
        ('Create an entra server in desktop mode',
         dict(create={'auth_method': 'entra'}, server_mode=False,
              expected_create=400, message='server mode')),
        ('Create an entra server without sslmode verify-full',
         dict(create={'auth_method': 'entra'}, ssl=REQUIRE,
              expected_create=400, message='verify-full')),
        ('Create an entra server without any sslmode',
         dict(create={'auth_method': 'entra'}, ssl=None,
              expected_create=400, message='verify-full')),
        ('Create an entra server with Kerberos',
         dict(create={'auth_method': 'entra', 'kerberos_conn': True},
              expected_create=400, message='Kerberos')),
        ('Switch a password server to entra and drop its saved password',
         dict(create={'save_password': True, 'password': 'secret'},
              expected_create=200,
              update={'auth_method': 'entra'}, expected_update=200,
              updated_method='entra', no_password_after_update=True)),
        ('Switch a password server to entra without verify-full',
         dict(create={}, ssl=REQUIRE, expected_create=200,
              update={'auth_method': 'entra'}, expected_update=400,
              updated_method='password', message='verify-full')),
        ('Switch a password server to entra without OBO',
         dict(create={}, expected_create=200, provider_config={},
              update={'auth_method': 'entra'}, expected_update=400,
              updated_method='password', message='OAUTH2_ENTRA_OBO_ENABLED')),
        ('Weaken the sslmode of an entra server',
         dict(create={'auth_method': 'entra'}, expected_create=200,
              update={'connection_params': {'changed': [
                  {'name': 'sslmode', 'value': 'require',
                   'keyword': 'sslmode'}]}},
              expected_update=400, updated_method='entra',
              message='verify-full')),
        ('Switch an entra server back to password in desktop mode',
         dict(create={'auth_method': 'entra'}, expected_create=200,
              update={'auth_method': 'password'}, expected_update=200,
              updated_method='password', server_mode_on_update=False)),
        ('Edit another field of an entra server after the login lost OBO',
         dict(create={'auth_method': 'entra'}, expected_create=200,
              update={'comment': 'edited'}, expected_update=200,
              updated_method='entra', provider_config_on_update={})),
    ]

    provider = 'entra'
    provider_config = OBO
    provider_config_on_update = None
    server_mode = True
    server_mode_on_update = None
    ssl = VERIFY_FULL
    update = None
    message = None
    no_password = False
    no_password_after_update = False

    def setUp(self):
        # The server is saved without connecting to it, so no PostgreSQL
        # server is needed.
        unittest.TestCase.setUp(self)
        self.server_id = None

    def _login_as(self, provider, provider_config, server_mode):
        """The user's OAuth2 login, as the backend sees it."""
        with self.tester.session_transaction() as sess:
            if provider:
                sess['oauth2_provider'] = provider
            else:
                sess.pop('oauth2_provider', None)
        source = MagicMock()
        source.oauth2_config = {provider: provider_config} if provider \
            else {}
        stack = [
            patch('pgadmin.authenticate.get_auth_sources',
                  return_value=source),
            patch.object(config, 'SERVER_MODE', server_mode),
        ]
        for p in stack:
            p.start()
        return stack

    def _payload(self):
        data = {
            'name': 'entra-probe',
            'host': 'database.example.test',
            'port': 5432,
            'db': 'postgres',
            'username': 'user@example.test',
            'role': None,
            'connect_now': False,
            'connection_params': [self.ssl] if self.ssl else [],
        }
        data.update(self.create)
        return data

    def _url(self, *parts):
        return '/browser/server/obj/{0}/'.format(
            utils.SERVER_GROUP) + ''.join(str(p) for p in parts)

    def _stored(self):
        with self.app.app_context():
            server = Server.query.filter_by(id=self.server_id).first()
            return server.auth_method, server.password, server.save_password

    def _login(self, config_override=None, mode_override=None):
        return self._login_as(
            self.provider,
            self.provider_config if config_override is None
            else config_override,
            self.server_mode if mode_override is None else mode_override)

    def runTest(self):
        patches = self._login()
        try:
            response = self.tester.post(
                self._url(), data=json.dumps(self._payload()),
                content_type='html/json')
        finally:
            for p in patches:
                p.stop()
        self.assertEqual(response.status_code, self.expected_create,
                         response.data)
        if self.expected_create != 200:
            self.assertIn(self.message,
                          json.loads(response.data)['errormsg'])
            return

        self.server_id = json.loads(
            response.data.decode('utf-8'))['node']['_id']
        method, password, save_password = self._stored()
        self.assertEqual(method, self.create.get('auth_method', 'password'))
        if self.no_password:
            self.assertIsNone(password)
            self.assertFalse(save_password)

        if self.update is None:
            return

        patches = self._login(self.provider_config_on_update,
                              self.server_mode_on_update)
        try:
            response = self.tester.put(
                self._url(self.server_id),
                data=json.dumps(dict(self.update, id=self.server_id)),
                content_type='html/json')
        finally:
            for p in patches:
                p.stop()
        self.assertEqual(response.status_code, self.expected_update,
                         response.data)
        if self.expected_update != 200:
            self.assertIn(self.message,
                          json.loads(response.data)['errormsg'])
        method, password, save_password = self._stored()
        self.assertEqual(method, self.updated_method)
        if self.no_password_after_update:
            self.assertIsNone(password)
            self.assertFalse(save_password)

    def tearDown(self):
        if self.server_id is not None:
            utils.delete_server_with_api(self.tester, self.server_id)


class EntraAvailableToTheDialogTestCase(BaseTestGenerator):
    """The backend tells the server dialog whether it may offer entra."""

    scenarios = [
        ('Offered when the login provider has On-Behalf-Of',
         dict(provider='entra', config=OBO, server_mode=True,
              expected='true')),
        ('Not offered when it does not',
         dict(provider='entra', config={}, server_mode=True,
              expected='false')),
        ('Not offered without an OAuth2 login',
         dict(provider=None, config={}, server_mode=True,
              expected='false')),
        ('Not offered in desktop mode',
         dict(provider='entra', config=OBO, server_mode=False,
              expected='false')),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        with self.tester.session_transaction() as sess:
            if self.provider:
                sess['oauth2_provider'] = self.provider
            else:
                sess.pop('oauth2_provider', None)
        source = MagicMock()
        source.oauth2_config = {self.provider: self.config}
        with patch('pgadmin.authenticate.get_auth_sources',
                   return_value=source), \
                patch.object(config, 'SERVER_MODE', self.server_mode):
            response = self.tester.get('/browser/js/utils.js')
        self.assertEqual(response.status_code, 200)
        self.assertIn("pgAdmin['entra_obo_available'] = " + self.expected,
                      response.data.decode('utf-8'))


class EntraSignInAgainOnCreateTestCase(BaseTestGenerator):
    """A server saved while the identity provider needs the user to sign in
    again stays registered: connecting it later offers "Sign in again". Any
    other connection failure still discards the new server."""

    scenarios = [
        ('Sign in again keeps the server',
         dict(sign_in_again=True, expected_status=200, kept=True)),
        ('Another failure discards the server',
         dict(sign_in_again=False, expected_status=401, kept=False)),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)
        self.server_id = None

    def runTest(self):
        sign_in_again = self.sign_in_again

        def connect(connection, **kwargs):
            connection.sign_in_again = sign_in_again
            return False, 'No access token is available.'

        source = MagicMock()
        source.oauth2_config = {'entra': OBO}
        data = {
            'name': 'entra-sign-in-probe',
            'host': 'database.example.test',
            'port': 5432,
            'db': 'postgres',
            'username': 'user@example.test',
            'role': None,
            'auth_method': 'entra',
            'connect_now': True,
            'connection_params': [VERIFY_FULL],
        }
        with self.tester.session_transaction() as sess:
            sess['oauth2_provider'] = 'entra'
        with patch('pgadmin.authenticate.get_auth_sources',
                   return_value=source), \
                patch('pgadmin.utils.driver.psycopg3.connection.'
                      'Connection.connect', autospec=True,
                      side_effect=connect):
            response = self.tester.post(
                '/browser/server/obj/{0}/'.format(utils.SERVER_GROUP),
                data=json.dumps(data), content_type='html/json')

        self.assertEqual(response.status_code, self.expected_status,
                         response.data)
        if self.kept:
            node = json.loads(response.data.decode('utf-8'))['node']
            self.server_id = node['_id']
            self.assertFalse(node['connected'])
        with self.app.app_context():
            self.assertEqual(
                Server.query.filter_by(name=data['name']).count(),
                1 if self.kept else 0)

    def tearDown(self):
        if self.server_id is not None:
            utils.delete_server_with_api(self.tester, self.server_id)
