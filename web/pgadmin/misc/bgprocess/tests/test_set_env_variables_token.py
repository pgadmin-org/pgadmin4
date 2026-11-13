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

from pgadmin.misc.bgprocess.processes import BatchProcess
from pgadmin.utils import pg_oauth2, token_auth
from pgadmin.utils.route import BaseTestGenerator
import pgadmin.utils.driver.psycopg3.server_manager as server_manager

METHOD = 'test_utility_token'


class TestSetEnvVariablesToken(BaseTestGenerator):
    """A background utility connects as the server's authentication method
    says: it gets sslrootcert as the main connection does, and for a token
    delivered as the password a fresh token, in the environment of this one
    process only. The token never reaches pgAdmin's own environment."""

    scenarios = [
        ('A fresh token for each utility',
         dict(case='fresh')),
        ('The sslrootcert of the server',
         dict(case='sslrootcert')),
        ('A token that cannot be had stops the job',
         dict(case='token_error')),
        ('The server must verify its identity',
         dict(case='verify_full')),
        ('A token that cannot be delivered in the environment',
         dict(case='bearer')),
        ('A password server asks for no token',
         dict(case='password_server')),
    ]

    def setUp(self):
        # No database is needed.
        unittest.TestCase.setUp(self)
        self.calls = []
        self.error = None
        self.registered = False

    def tearDown(self):
        if self.registered:
            token_auth.unregister_token_auth_method(METHOD)

    def _provider(self, connection_params):
        self.calls.append(dict(connection_params))
        if self.error:
            raise self.error
        return 'utility-token-{0}'.format(len(self.calls))

    def _env(self, auth_method=METHOD, params=None, delivery=None):
        if auth_method == METHOD:
            token_auth.register_token_auth_method(
                METHOD, self._provider,
                delivery or token_auth.PasswordDelivery(),
                token_auth.get_token_auth_method('entra').check)
            self.registered = True
        p = BatchProcess.__new__(BatchProcess)
        p.id = 'pga_test_token_process'
        p.env = dict()
        manager = server_manager.ServerManager.__new__(
            server_manager.ServerManager)
        manager.password = None
        manager.passexec = None
        manager.auth_method = auth_method
        manager.connection_params = params or {
            'sslmode': 'verify-full', 'sslrootcert': 'system'}
        manager.use_ssh_tunnel = False
        manager.service = None
        p.manager_obj = manager
        before = dict(os.environ)
        with self.app.app_context():
            p.set_env_variables(None)
        self.assertEqual(dict(os.environ), before)
        return p

    def runTest(self):
        getattr(self, 'case_' + self.case)()

    def case_fresh(self):
        first = self._env()
        second = self._env()

        self.assertEqual(first.env[first.id], 'utility-token-1')
        self.assertEqual(second.env[second.id], 'utility-token-2')

    def case_sslrootcert(self):
        p = self._env(params={'sslmode': 'verify-full',
                              'sslrootcert': 'system'})

        self.assertEqual(p.env['PGSSLROOTCERT'], 'system')
        self.assertEqual(p.env['PGSSLMODE'], 'verify-full')

    def case_token_error(self):
        self.error = pg_oauth2.OAuthSignInRequired('Sign in again.')

        with self.assertRaisesRegex(pg_oauth2.OAuthTokenError,
                                    'Sign in again'):
            self._env()

    def case_verify_full(self):
        with self.assertRaisesRegex(pg_oauth2.OAuthTokenError,
                                    'verify-full'):
            self._env(params={'sslmode': 'require'})

        # No token was requested for a server that may not be sent one.
        self.assertEqual(self.calls, [])

    def case_bearer(self):
        # libpq 18's OAUTHBEARER token reaches a connection through a hook
        # in the process that opens it, which a separate utility process
        # cannot have: nothing is put in its environment.
        p = self._env(delivery=token_auth.OAuthBearerDelivery())

        self.assertNotIn(p.id, p.env)
        self.assertEqual(self.calls, [])

    def case_password_server(self):
        p = self._env(auth_method='password')

        self.assertNotIn(p.id, p.env)
