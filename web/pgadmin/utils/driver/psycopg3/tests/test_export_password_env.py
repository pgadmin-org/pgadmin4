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
import tempfile
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


SERVICE_FILE = """\
# Services the administrator allows.
[stored] # comments may follow the name
host=db.example.com
password=stale-shared-password

[plain]
dbname=postgres
options=-c search_path=app
"""


class TokenUtilityServicePasswordTestCase(BaseTestGenerator):
    """libpq takes a service's password over the PGPASSWORD a utility gets
    its token in, so a token method's utility is refused a service that
    stores one, before any token is requested."""

    scenarios = [
        ('A service that stores a password',
         dict(service='stored', refused=True)),
        ('A service without a password',
         dict(service='plain', refused=False)),
        ('A service not in the file', dict(service='other', refused=False)),
        ('No service', dict(service=None, refused=False)),
    ]

    def setUp(self):
        unittest.TestCase.setUp(self)

    def runTest(self):
        from pgadmin.utils.pg_oauth2 import OAuthTokenError
        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.auth_method = 'entra'
        manager.connection_params = {'sslmode': 'verify-full'}
        manager.host = 'db.example.com'
        manager.service = self.service

        env = {}
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, 'pg_service.conf')
            with open(path, 'w') as service_file:
                service_file.write(SERVICE_FILE)
            # A utility is started from a request, which the refusal's
            # message is translated for.
            with self.app.test_request_context(), \
                    patch.dict(os.environ, {'PGSERVICEFILE': path}), \
                    patch.object(server_manager, 'utility_password',
                                 return_value='the-token') as token:
                os.environ.pop('PGSYSCONFDIR', None)
                if self.refused:
                    with self.assertRaises(OAuthTokenError) as raised:
                        manager.export_password_env(env, 'PGPASSWORD')
                    self.assertIn('stored', str(raised.exception))
                else:
                    manager.export_password_env(env, 'PGPASSWORD')

        if self.refused:
            token.assert_not_called()
            self.assertEqual(env, {})
        else:
            self.assertEqual(env, {'PGPASSWORD': 'the-token'})
