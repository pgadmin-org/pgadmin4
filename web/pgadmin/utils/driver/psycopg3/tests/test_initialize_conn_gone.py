##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression tests: when a setup query in ``Connection._initialize()``
fails after the underlying connection has already been dropped, the
query's error is returned rather than an AttributeError from closing a
connection that is no longer there (#10728). This includes the SET ROLE
query run by ``Connection._set_role()``."""

from unittest.mock import MagicMock, patch

from pgadmin.utils.driver.psycopg3 import connection as connection_module
from pgadmin.utils.driver.psycopg3.connection import Connection
from pgadmin.utils.route import BaseTestGenerator

ERROR = 'server closed the connection unexpectedly'


class InitializeConnectionGoneTest(BaseTestGenerator):

    scenarios = [
        ('The session setup query fails',
         dict(role=None, failing_query=0, expected=ERROR)),
        ('The version query fails',
         dict(role=None, failing_query=1, expected=ERROR)),
        ('The SET ROLE query fails',
         dict(role='test_role', failing_query=1,
              expected='Failed to setup the role \n' + ERROR)),
    ]

    def runTest(self):
        manager = MagicMock(sid=1, role=self.role)
        conn = Connection(manager, 'test-conn-id', 'testdb')
        pg_conn = MagicMock()
        pg_conn.info.backend_pid = 42
        conn.conn = pg_conn
        calls = []

        def execute(cur, query, params=None):
            calls.append(query)
            if len(calls) - 1 == self.failing_query:
                # Something else has already dropped the connection.
                conn.conn = None
                return ERROR
            return None

        with self.app.test_request_context(), \
                patch.object(connection_module,
                             'register_string_typecasters'), \
                patch.object(connection_module,
                             'register_binary_typecasters'), \
                patch.object(connection_module, 'get_encoding',
                             return_value=('UTF8', 'utf-8')), \
                patch.object(conn, '_Connection__cursor',
                             return_value=(True, MagicMock())), \
                patch.object(conn, 'qtLiteral',
                             side_effect=lambda value, *args: value), \
                patch.object(conn, 'execute_scalar',
                             return_value=(True, self.role)), \
                patch.object(conn, '_execute', side_effect=execute), \
                patch.object(self.app.logger, 'error'):
            status, msg = conn._initialize('test-conn-id')

        self.assertFalse(status)
        self.assertEqual(msg, self.expected)
        self.assertIsNone(conn.conn)
        self.assertEqual(len(calls), self.failing_query + 1)
        pg_conn.close.assert_not_called()
