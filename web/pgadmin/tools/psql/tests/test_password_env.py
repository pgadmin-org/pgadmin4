##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import unittest
from unittest.mock import MagicMock, patch

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.tools import psql
import pgadmin.utils.driver.psycopg3.server_manager as server_manager

PASSWORD = 'not-for-the-next-user'


class PSQLPasswordEnvTestCase(BaseTestGenerator):
    """psql gets the server's password in its own environment, and
    pgAdmin's environment, which every user's psql sessions and utilities
    inherit, is left unchanged."""

    scenarios = [
        ('The password goes to this psql only', dict()),
    ]

    def setUp(self):
        # No database is needed.
        unittest.TestCase.setUp(self)

    def runTest(self):
        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.password = b'encrypted'
        manager.passexec = None
        manager.user = 'alice'
        manager.kerberos_conn = False
        manager.create_connection_string = MagicMock(
            return_value='host=127.0.0.1 dbname=postgres user=alice')

        before = dict(os.environ)
        env = {}
        with self.app.test_request_context(), \
                patch.object(server_manager, 'get_crypt_key',
                             return_value=(True, 'key')), \
                patch.object(server_manager, 'decrypt',
                             return_value=PASSWORD.encode()), \
                patch.object(psql.config, 'SERVER_MODE', False):
            args = psql.get_connection_str('/usr/bin/psql', 'postgres',
                                           manager, env)
            child_env = psql.get_user_env(env)

        self.assertEqual(args, ['/usr/bin/psql',
                                'host=127.0.0.1 dbname=postgres user=alice'])
        self.assertEqual(child_env.get('PGPASSWORD'), PASSWORD)
        self.assertIsNot(child_env, os.environ)
        self.assertEqual(dict(os.environ), before)


class PSQLUserEnvTestCase(BaseTestGenerator):
    """The psqlrc and history paths for one user are set in that user's
    psql environment, not in pgAdmin's."""

    scenarios = [
        ('Server mode psqlrc and history', dict()),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        user = MagicMock(username='pga_test_psql_user')
        before = dict(os.environ)
        with patch.object(psql.config, 'SERVER_MODE', True), \
                patch.object(psql.config, 'ENABLE_PSQL', True), \
                patch.object(psql, 'current_user', user), \
                patch.dict(os.environ, {
                    user.username: '{"PSQLRC": "/s/.psqlrc", '
                                   '"PSQL_HISTORY": "/s/.psql_history"}'}):
            inside = dict(os.environ)
            env = psql.get_user_env()
            self.assertEqual(dict(os.environ), inside)

        self.assertEqual(env['PSQLRC'], '/s/.psqlrc')
        self.assertEqual(env['PSQL_HISTORY'], '/s/.psql_history')
        self.assertEqual(dict(os.environ), before)
