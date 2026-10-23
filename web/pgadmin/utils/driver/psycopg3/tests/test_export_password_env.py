##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests that a server's password is handed to a child process through the
environment built for it, and never left in pgAdmin's own environment,
which every user's requests share and every child process inherits."""

import os
import unittest
from unittest.mock import MagicMock, patch

from pgadmin.utils.route import BaseTestGenerator
import pgadmin.utils.driver.psycopg3.server_manager as server_manager

PASSWORD = 'not-for-the-next-user'


class ExportPasswordEnvTestCase(BaseTestGenerator):
    scenarios = [
        ('A saved password', dict(saved=True)),
        ('A password exec command', dict(saved=False)),
    ]

    def setUp(self):
        # No database is needed.
        unittest.TestCase.setUp(self)

    def runTest(self):
        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.password = b'encrypted' if self.saved else None
        manager.passexec = MagicMock()
        manager.passexec.get.return_value = PASSWORD

        env = {}
        before = dict(os.environ)
        with patch.object(server_manager, 'get_crypt_key',
                          return_value=(True, 'key')), \
                patch.object(server_manager, 'decrypt',
                             return_value=PASSWORD.encode()):
            manager.export_password_env(env, 'PGA_TEST_PASSWORD')

        self.assertEqual(env, {'PGA_TEST_PASSWORD': PASSWORD})
        self.assertEqual(dict(os.environ), before)
