##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression tests: ``Connection.reset()`` reconnects once the password
has been decrypted, refuses to when it cannot be, and reports a failure to
reconnect instead of raising while logging it."""

from unittest.mock import MagicMock, patch

import psycopg

from pgadmin.utils.driver.psycopg3 import connection as connection_module
from pgadmin.utils.driver.psycopg3.connection import Connection
from pgadmin.utils.route import BaseTestGenerator


class ResetConnectionTest(BaseTestGenerator):

    scenarios = [
        ('Reset reconnects', dict(decrypted=True, connect_error=None)),
        ('A failed reconnection is returned and logged',
         dict(decrypted=True, connect_error='boom')),
        ('A password that cannot be decrypted is not used',
         dict(decrypted=False, connect_error=None)),
    ]

    def runTest(self):
        manager = MagicMock(sid=1, kerberos_conn=False)
        manager.create_connection_string.return_value = 'dbname=testdb'
        conn = Connection(manager, 'test-conn-id', 'testdb')
        pg_conn = MagicMock()
        pg_conn.info.backend_pid = 42
        connect = MagicMock(return_value=pg_conn)
        if self.connect_error:
            connect.side_effect = psycopg.OperationalError(
                self.connect_error)
        decrypt = (True, '', 'secret') if self.decrypted else \
            (False, 'The master password is not set.', 'encrypted')

        with self.app.test_request_context(), \
                patch.object(conn, '_decrypt_password',
                             return_value=decrypt), \
                patch.object(connection_module.psycopg, 'connect', connect), \
                patch.object(self.app.logger, 'error') as log_error:
            status, msg = conn.reset()

        if not self.decrypted:
            self.assertFalse(status)
            self.assertEqual(msg, 'The master password is not set.')
            connect.assert_not_called()
            return

        manager.create_connection_string.assert_called_once_with(
            'testdb', manager.user, 'secret')
        if self.connect_error:
            self.assertFalse(status)
            self.assertEqual(msg, self.connect_error)
            log_error.assert_called_once()
            logged = log_error.call_args[0][0]
            self.assertIn('Failed to reset the connection', logged)
            self.assertIn(msg, logged)
        else:
            self.assertTrue(status)
            self.assertIsNone(msg)
            self.assertIs(conn.conn, pg_conn)
