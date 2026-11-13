##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""When the identity provider needs the user to sign in to pgAdmin again,
the server and Query Tool connect endpoints answer with a distinct
"sign in again" response, not a database password prompt and not a plain
error. Every other token failure stays a plain error."""

import json
import unittest
from unittest.mock import MagicMock, patch

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils

CONNECT = 'pgadmin.utils.driver.psycopg3.connection.Connection.connect'
VERIFY_FULL = {'name': 'sslmode', 'value': 'verify-full',
               'keyword': 'sslmode'}
ENDPOINTS = {
    'server': '/browser/server/connect/{gid}/{sid}',
    'query tool': '/sqleditor/initialize/sqleditor/1234/{gid}/{sid}/1',
    'view data': '/sqleditor/initialize/viewdata/1234/3/table/{gid}/{sid}/'
                 '1/1',
}


class SignInAgainResponseTestCase(BaseTestGenerator):

    scenarios = [
        ('{0} {1}'.format(endpoint, case),
         dict(endpoint=endpoint, sign_in_again=sign_in_again))
        for endpoint in ENDPOINTS
        for case, sign_in_again in (('sign in again', True),
                                    ('other token error', False))
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)
        self.server_id = None

    def _create_server(self):
        source = MagicMock()
        source.oauth2_config = {
            'entra': {'OAUTH2_ENTRA_OBO_ENABLED': True}}
        with self.tester.session_transaction() as sess:
            sess['oauth2_provider'] = 'entra'
        with patch('pgadmin.authenticate.get_auth_sources',
                   return_value=source):
            response = self.tester.post(
                '/browser/server/obj/{0}/'.format(utils.SERVER_GROUP),
                data=json.dumps({
                    'name': 'sign-in-again-probe',
                    'host': 'database.example.test', 'port': 5432,
                    'db': 'postgres', 'username': 'user@example.test',
                    'role': None, 'auth_method': 'entra',
                    'connect_now': False,
                    'connection_params': [VERIFY_FULL]}),
                content_type='html/json')
        self.assertEqual(response.status_code, 200, response.data)
        self.server_id = json.loads(
            response.data.decode('utf-8'))['node']['_id']

    def runTest(self):
        self._create_server()
        sign_in_again = self.sign_in_again

        def connect(connection, **kwargs):
            connection.sign_in_again = sign_in_again
            return False, 'The login of this user has expired.'

        url = ENDPOINTS[self.endpoint].format(
            gid=utils.SERVER_GROUP, sid=self.server_id)
        with patch(CONNECT, autospec=True, side_effect=connect):
            response = self.tester.post(
                url, data=json.dumps({'dbname': 'postgres'}),
                content_type='html/json')
        body = json.loads(response.data.decode('utf-8'))

        if sign_in_again:
            self.assertEqual(response.status_code, 428, response.data)
            result = body['result']
            self.assertTrue(result['sign_in_again'])
            self.assertFalse(result.get('prompt_password'))
            self.assertFalse(result.get('prompt_tunnel_password'))
            self.assertEqual(result['server_label'], 'sign-in-again-probe')
            self.assertEqual(result['errmsg'],
                             'The login of this user has expired.')
        else:
            self.assertNotEqual(response.status_code, 428, response.data)
            self.assertFalse((body.get('result') or {}).get(
                'sign_in_again', False))
            self.assertFalse((body.get('result') or {}).get(
                'prompt_password', False))

    def tearDown(self):
        if self.server_id is not None:
            utils.delete_server_with_api(self.tester, self.server_id)
