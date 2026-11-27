##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A server can be saved with, and read back with, each server
authentication method. The OAuth parameters stay ordinary libpq connection
parameters, and the old token mode connection parameter is refused."""

import json
import unittest

from pgadmin.model import Server
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils

OAUTH_PARAMS = [
    {'name': 'oauth_issuer', 'value': 'https://idp.example.test/realms/pg',
     'keyword': 'oauth_issuer'},
    {'name': 'oauth_client_id', 'value': 'postgres-cluster',
     'keyword': 'oauth_client_id'},
    {'name': 'oauth_scope', 'value': 'openid', 'keyword': 'oauth_scope'},
]


class ServerAuthMethodTestCase(BaseTestGenerator):

    scenarios = [
        ('Create a server that uses the default method',
         dict(create={}, expected_create=200, expected_method='password')),
        ('Create a password server',
         dict(create={'auth_method': 'password'}, expected_create=200,
              expected_method='password')),
        ('Create an oauth_direct server',
         dict(create={'auth_method': 'oauth_direct'}, expected_create=200,
              expected_method='oauth_direct', oauth_params=True)),
        ('Create an oauth_exchange server',
         dict(create={'auth_method': 'oauth_exchange'}, expected_create=200,
              expected_method='oauth_exchange', oauth_params=True)),
        ('Create a server with an unknown method is refused',
         dict(create={'auth_method': 'magic'}, expected_create=400,
              message='magic')),
        ('Create a server with the removed token mode parameter is refused',
         dict(create={'connection_params': [
             {'name': 'oauth_pgadmin_token_mode', 'value': 'direct',
              'keyword': 'oauth_pgadmin_token_mode'}]},
              expected_create=400, message='oauth_pgadmin_token_mode')),
        ('Switch a password server to oauth_direct',
         dict(create={}, expected_create=200, expected_method='password',
              update={'auth_method': 'oauth_direct'}, expected_update=200,
              updated_method='oauth_direct')),
        ('Switch an oauth_exchange server back to password',
         dict(create={'auth_method': 'oauth_exchange'}, expected_create=200,
              expected_method='oauth_exchange',
              update={'auth_method': 'password'}, expected_update=200,
              updated_method='password')),
        ('Switch to an unknown method is refused',
         dict(create={'auth_method': 'oauth_direct'}, expected_create=200,
              expected_method='oauth_direct',
              update={'auth_method': 'magic'}, expected_update=400,
              updated_method='oauth_direct', message='magic')),
    ]

    oauth_params = False
    update = None
    message = None

    def setUp(self):
        # The server is saved without connecting to it, so no PostgreSQL
        # server is needed.
        unittest.TestCase.setUp(self)
        self.server_id = None

    def _payload(self):
        params = [{'name': 'sslmode', 'value': 'verify-full',
                   'keyword': 'sslmode'}]
        if self.oauth_params:
            params += OAUTH_PARAMS
        data = {
            'name': 'auth-method-probe',
            'host': 'database.example.test',
            'port': 5432,
            'db': 'postgres',
            'username': 'database-user',
            'role': None,
            'sslmode': 'prefer',
            'connect_now': False,
            'connection_params': params,
        }
        data.update(self.create)
        return data

    def _url(self, *parts):
        return '/browser/server/obj/{0}/'.format(
            utils.SERVER_GROUP) + ''.join(str(p) for p in parts)

    def _properties(self):
        response = self.tester.get(self._url(self.server_id))
        self.assertEqual(response.status_code, 200, response.data)
        return json.loads(response.data.decode('utf-8'))

    def _stored_method(self):
        with self.app.app_context():
            return Server.query.filter_by(
                id=self.server_id).first().auth_method

    def runTest(self):
        response = self.tester.post(
            self._url(), data=json.dumps(self._payload()),
            content_type='html/json')
        self.assertEqual(response.status_code, self.expected_create,
                         response.data)
        if self.expected_create != 200:
            self.assertIn(self.message,
                          json.loads(response.data)['errormsg'])
            return

        self.server_id = json.loads(
            response.data.decode('utf-8'))['node']['_id']
        self.assertEqual(self._stored_method(), self.expected_method)

        properties = self._properties()
        self.assertEqual(properties['auth_method'], self.expected_method)
        # The OAuth parameters are plain connection parameters.
        names = {p['name'] for p in properties['connection_params']}
        self.assertEqual(
            {'oauth_issuer', 'oauth_client_id', 'oauth_scope'} <= names,
            self.oauth_params)

        if self.update is None:
            return

        response = self.tester.put(
            self._url(self.server_id),
            data=json.dumps(dict(self.update, id=self.server_id)),
            content_type='html/json')
        self.assertEqual(response.status_code, self.expected_update,
                         response.data)
        if self.expected_update != 200:
            self.assertIn(self.message,
                          json.loads(response.data)['errormsg'])
        self.assertEqual(self._stored_method(), self.updated_method)
        self.assertEqual(self._properties()['auth_method'],
                         self.updated_method)

    def tearDown(self):
        if self.server_id is not None:
            utils.delete_server_with_api(self.tester, self.server_id)
