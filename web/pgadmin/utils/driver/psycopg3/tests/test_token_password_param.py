##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A password connection parameter never replaces the token of a token
method in the connection string; a password server keeps it."""

import unittest
from unittest.mock import patch

import config
from pgadmin.utils.route import BaseTestGenerator

import pgadmin.utils.driver.psycopg3.server_manager as server_manager


def _fake_make_conninfo(conninfo='', **kwargs):
    return ' '.join('{0}={1}'.format(k, v) for k, v in kwargs.items()
                    if v is not None)


def _parse_fake(conninfo):
    return dict(item.split('=', 1) for item in conninfo.split(' ') if item)


class TokenPasswordParamTestCase(BaseTestGenerator):

    scenarios = [
        ('The entra token wins over a stored password parameter',
         dict(auth_method='entra', password='fresh-token',
              expected='fresh-token')),
        ('An OAuth method sends no stored password parameter',
         dict(auth_method='oauth_direct', password=None, expected=None)),
        ('A password server keeps its password parameter',
         dict(auth_method='password', password=None,
              expected='stored-password')),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.host = 'db.example.test'
        manager.port = 5432
        manager.use_ssh_tunnel = False
        manager.service = None
        manager.kerberos_conn = False
        manager.auth_method = self.auth_method
        manager.connection_params = {'password': 'stored-password',
                                     'sslmode': 'verify-full'}

        with self.app.test_request_context(), \
                patch.object(config, 'SERVER_MODE', False), \
                patch.dict(self.app.config, {'SERVER_MODE': False}), \
                patch.object(server_manager, 'make_conninfo',
                             _fake_make_conninfo):
            dsn = manager.create_connection_string(
                'postgres', 'alice', self.password)

        values = _parse_fake(dsn)
        self.assertEqual(values.get('password'), self.expected)
        self.assertEqual(values.get('sslmode'), 'verify-full')
