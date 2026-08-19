##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression test: ``execute_void()`` must not run a transaction-control
statement (BEGIN/COMMIT/ROLLBACK) through a cached named/server-side
cursor.

A named cursor's ``execute()`` always wraps the statement as
``DECLARE ... CURSOR FOR <query>``, which cannot express BEGIN/COMMIT/
ROLLBACK. Before the fix, the Commit/Rollback buttons under "server
cursor" mode silently did nothing: the DECLARE-wrapped call failed
(actually failing one step earlier, on a ``prepare`` keyword the
server-side cursor's ``execute()`` doesn't accept at all), the exception
was swallowed by the background query thread, and the next poll() then
reported the *previous* query's leftover column info, making the result
grid appear instead of the Messages tab (pgAdmin issue #8991)."""

from unittest.mock import MagicMock, patch

from pgadmin.utils.driver.psycopg3.connection import Connection
from pgadmin.utils.driver.psycopg3.cursor import AsyncDictServerCursor
from pgadmin.utils.route import BaseTestGenerator


class ExecuteVoidServerCursorTest(BaseTestGenerator):

    scenarios = [
        ('COMMIT with a cached server-side cursor runs on a throwaway '
         'plain cursor and clears stale column info', dict(sql='COMMIT;')),
        ('ROLLBACK with a cached server-side cursor runs on a throwaway '
         'plain cursor and clears stale column info',
         dict(sql='ROLLBACK;')),
    ]

    def runTest(self):
        manager = MagicMock(sid=1)
        conn = Connection(manager, 'test-conn-id', 'testdb')
        conn.python_encoding = 'utf-8'

        # Leftover state from a previous SELECT executed through the
        # server-side cursor.
        conn.column_info = [{'name': 'x'}]
        conn.row_count = 1

        server_cursor = MagicMock(spec=AsyncDictServerCursor)
        server_cursor.closed = False

        plain_cursor = MagicMock()
        plain_cursor.closed = False

        conn.conn = MagicMock()
        conn.conn.cursor.return_value = plain_cursor
        conn.conn.info.user = 'postgres'
        conn.conn.info.host = 'localhost'
        conn.conn.info.dbname = 'testdb'

        # current_user needs a real request context to resolve at all;
        # patch it only once inside that context, to a stand-in with the
        # attribute execute_void()'s log line reads.
        with self.app.test_request_context():
            with patch(
                'pgadmin.utils.driver.psycopg3.connection.current_user',
                MagicMock(email='test@example.com')
            ), patch.object(Connection, '_Connection__cursor',
                            return_value=(True, server_cursor)):
                status, result = conn.execute_void(self.sql)

        self.assertTrue(status)
        self.assertIsNone(result)

        # The statement ran on the throwaway plain cursor, not the
        # cached server-side one.
        plain_cursor.execute.assert_called_once()
        server_cursor.execute.assert_not_called()

        # Stale result-set state from the prior SELECT must not leak
        # into whatever poll() call comes next.
        self.assertIsNone(conn.column_info)
        self.assertEqual(conn.row_count, 0)
