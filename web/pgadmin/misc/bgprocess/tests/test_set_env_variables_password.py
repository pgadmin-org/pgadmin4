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
from unittest.mock import patch

from pgadmin.misc.bgprocess.processes import BatchProcess
from pgadmin.utils.route import BaseTestGenerator
import pgadmin.utils.driver.psycopg3.server_manager as server_manager

PASSWORD = 'not-for-the-next-user'


class TestSetEnvVariablesPassword(BaseTestGenerator):
    """The password goes into the environment of this one process, for
    the process executor to pass to the utility as PGPASSWORD, and not into
    pgAdmin's own environment, from which every later process started for
    any user would inherit it."""

    scenarios = [
        ('The password is passed to this process only', dict()),
    ]

    def setUp(self):
        # No database is needed.
        unittest.TestCase.setUp(self)

    def runTest(self):
        p = BatchProcess.__new__(BatchProcess)
        p.id = 'pga_test_password_process'
        p.env = dict()

        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.password = b'encrypted'
        manager.passexec = None
        manager.connection_params = {}
        manager.use_ssh_tunnel = False
        manager.service = None
        p.manager_obj = manager

        before = dict(os.environ)
        with self.app.app_context(), \
                patch.object(server_manager, 'get_crypt_key',
                             return_value=(True, 'key')), \
                patch.object(server_manager, 'decrypt',
                             return_value=PASSWORD.encode()):
            p.set_env_variables(None)

        self.assertEqual(p.env.get(p.id), PASSWORD)
        self.assertEqual(dict(os.environ), before)
