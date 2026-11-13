##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Kerberos is exclusive with the token server authentication methods: the
servers API refuses to create or update a server that would use both."""

import json
import unittest

from pgadmin.model import Server
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils


class ServerKerberosExclusivityTestCase(BaseTestGenerator):

    scenarios = [
        ('Create with Kerberos and a token method is refused',
         dict(create={'kerberos_conn': True, 'auth_method': 'oauth_direct'},
              expected_create=400)),
        ('Create with Kerberos and oauth_exchange is refused',
         dict(create={'kerberos_conn': True,
                      'auth_method': 'oauth_exchange'},
              expected_create=400)),
        ('Create with Kerberos and password is accepted',
         dict(create={'kerberos_conn': True, 'auth_method': 'password'},
              expected_create=200, expected_kerberos=True)),
        ('Create with Kerberos and no method is accepted',
         dict(create={'kerberos_conn': True}, expected_create=200,
              expected_kerberos=True)),
        ('Create a token server without Kerberos is accepted',
         dict(create={'kerberos_conn': False,
                      'auth_method': 'oauth_direct'},
              expected_create=200, expected_kerberos=False)),
        ('Enable Kerberos on a token server is refused',
         dict(create={'auth_method': 'oauth_direct'}, expected_create=200,
              expected_kerberos=False, update={'kerberos_conn': True},
              expected_update=400)),
        ('Select a token method on a Kerberos server is refused',
         dict(create={'kerberos_conn': True}, expected_create=200,
              expected_kerberos=True,
              update={'auth_method': 'oauth_exchange'},
              expected_update=400)),
        ('Select a token method and Kerberos together is refused',
         dict(create={}, expected_create=200, expected_kerberos=False,
              update={'auth_method': 'oauth_direct', 'kerberos_conn': True},
              expected_update=400)),
        ('Switch from a token method to Kerberos in one update',
         dict(create={'auth_method': 'oauth_direct'}, expected_create=200,
              expected_kerberos=False,
              update={'auth_method': 'password', 'kerberos_conn': True},
              expected_update=200, updated_kerberos=True,
              updated_method='password')),
        ('Switch from Kerberos to a token method in one update',
         dict(create={'kerberos_conn': True}, expected_create=200,
              expected_kerberos=True,
              update={'auth_method': 'oauth_direct',
                      'kerberos_conn': False},
              expected_update=200, updated_kerberos=False,
              updated_method='oauth_direct')),
    ]

    update = None
    expected_kerberos = False
    updated_kerberos = None
    updated_method = None

    def setUp(self):
        # The server is saved without connecting to it, so no PostgreSQL
        # server is needed.
        unittest.TestCase.setUp(self)
        self.server_id = None

    def _url(self, *parts):
        return '/browser/server/obj/{0}/'.format(
            utils.SERVER_GROUP) + ''.join(str(p) for p in parts)

    def _stored(self):
        with self.app.app_context():
            row = Server.query.filter_by(id=self.server_id).first()
            return bool(row.kerberos_conn), row.auth_method

    def runTest(self):
        data = {
            'name': 'kerberos-exclusivity-probe',
            'host': 'database.example.test',
            'port': 5432,
            'db': 'postgres',
            'username': 'database-user',
            'role': None,
            'connect_now': False,
            'connection_params': [
                {'name': 'sslmode', 'value': 'prefer', 'keyword': 'sslmode'}
            ],
        }
        data.update(self.create)
        response = self.tester.post(
            self._url(), data=json.dumps(data), content_type='html/json')
        self.assertEqual(response.status_code, self.expected_create,
                         response.data)
        if self.expected_create != 200:
            self.assertIn('Kerberos',
                          json.loads(response.data)['errormsg'])
            return

        self.server_id = json.loads(
            response.data.decode('utf-8'))['node']['_id']
        before = self._stored()
        self.assertEqual(before[0], self.expected_kerberos)

        if self.update is None:
            return

        response = self.tester.put(
            self._url(self.server_id),
            data=json.dumps(dict(self.update, id=self.server_id)),
            content_type='html/json')
        self.assertEqual(response.status_code, self.expected_update,
                         response.data)
        if self.expected_update != 200:
            self.assertIn('Kerberos',
                          json.loads(response.data)['errormsg'])
            # Nothing was stored.
            self.assertEqual(self._stored(), before)
        else:
            self.assertEqual(self._stored(),
                             (self.updated_kerberos, self.updated_method))

    def tearDown(self):
        if self.server_id is not None:
            utils.delete_server_with_api(self.tester, self.server_id)
