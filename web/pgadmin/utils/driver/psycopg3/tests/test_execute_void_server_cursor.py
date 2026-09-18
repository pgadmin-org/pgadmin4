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
grid appear instead of the Messages tab (pgAdmin issue #8991).

Clearing ``column_info``/``row_count`` in ``execute_void()`` is not enough
on its own, because ``poll()`` rebuilds both from whatever
``self.__async_cursor`` points at, and that is still the cached
server-side cursor: it reports itself open, so the ``not cur or
cur.closed`` guard lets it through and the previous query's metadata comes
straight back. The throwaway cursor therefore has to become the async
cursor as well, which also makes ``status_message()`` report the
transaction-control statement rather than the previous query. That
promotion is limited to transaction-control statements, for the reason
given in ``ExecuteVoidNonTransactionServerCursorTest`` below."""

from unittest.mock import MagicMock, patch

from pgadmin.utils.driver.psycopg3.connection import (
    Connection, _is_transaction_control
)
from pgadmin.utils.driver.psycopg3.cursor import AsyncDictServerCursor
from pgadmin.utils.route import BaseTestGenerator


class ExecuteVoidServerCursorTest(BaseTestGenerator):

    scenarios = [
        ('COMMIT with a cached server-side cursor runs on a throwaway '
         'plain cursor, and a following poll() reports no result set',
         dict(sql='COMMIT;')),
        ('ROLLBACK with a cached server-side cursor runs on a throwaway '
         'plain cursor, and a following poll() reports no result set',
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

        # The cursor the previous SELECT ran on, which is both cached for
        # the connection and still referenced as the async cursor. It
        # reports itself open, and still describes that SELECT's result.
        stale_column = MagicMock()
        stale_column.to_dict.return_value = {'name': 'x'}
        server_cursor = MagicMock(spec=AsyncDictServerCursor)
        server_cursor.closed = False
        server_cursor.description = [stale_column]
        server_cursor.ordered_description.return_value = [stale_column]
        # AsyncDictServerCursor.get_rowcount() answers 1 unconditionally.
        server_cursor.get_rowcount.return_value = 1
        server_cursor.nextset.return_value = None
        server_cursor.statusmessage = 'SELECT 1'
        conn._Connection__async_cursor = server_cursor

        # The throwaway cursor execute_void() should use instead. A
        # transaction-control statement leaves no result set behind, so it
        # has no description and no rows.
        plain_cursor = MagicMock()
        plain_cursor.closed = False
        # Values taken from what psycopg actually leaves on the cursor
        # after a COMMIT/ROLLBACK: no description, and a result with no
        # tuples in it, which AsyncDictCursor.get_rowcount() reports as 0.
        plain_cursor.description = None
        plain_cursor.get_rowcount.return_value = 0
        plain_cursor.nextset.return_value = None
        plain_cursor.statusmessage = self.sql.rstrip(';')

        conn.conn = MagicMock()
        conn.conn.cursor.return_value = plain_cursor
        conn.conn.info.user = 'postgres'
        conn.conn.info.host = 'localhost'
        conn.conn.info.dbname = 'testdb'
        # Not ACTIVE, and no connection level error, so poll() gets as far
        # as reading the cursor rather than answering from either of those.
        conn.conn.info.transaction_status = 2
        conn.conn.pgconn.error_message = None

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

        # ... and the poll() that the Query Tool makes next must not put it
        # back. This is the call that made the result grid appear instead
        # of the Messages tab, because it rebuilds column_info and
        # row_count from the async cursor, which was still the server-side
        # one describing the previous SELECT.
        with self.app.test_request_context():
            status, result = conn.poll(no_result=True)
            status_message = conn.status_message()

        self.assertEqual(status, 1)
        self.assertIsNone(result)
        self.assertIsNone(conn.column_info)
        self.assertEqual(conn.row_count, 0)
        server_cursor.ordered_description.assert_not_called()

        # The status message belongs to the statement just run, not to the
        # previous query.
        self.assertEqual(status_message, self.sql.rstrip(';'))


class ExecuteVoidNonTransactionServerCursorTest(BaseTestGenerator):
    """A statement that is not transaction control must leave the cached
    server-side cursor in place as the async cursor.

    ``execute_void()`` runs on a throwaway plain cursor whenever the cached
    cursor is a server-side one, but only a transaction-control statement
    has that throwaway become the async cursor. Promoting it for every
    statement would let something like the ``SELECT pg_cancel_backend(...)``
    that ``cancel_transaction()`` issues detach the cursor a result set is
    still being paged or downloaded from, so that the pagination and
    download calls that follow read the throwaway and find no rows.
    """

    scenarios = [
        ('a non-transaction statement keeps the cached server-side cursor '
         'as the async cursor',
         dict(sql='SELECT pg_cancel_backend(1234);')),
    ]

    def runTest(self):
        manager = MagicMock(sid=1)
        conn = Connection(manager, 'test-conn-id', 'testdb')
        conn.python_encoding = 'utf-8'

        # State from the query whose result set is still being read.
        conn.column_info = [{'name': 'x'}]
        conn.row_count = 1

        server_cursor = MagicMock(spec=AsyncDictServerCursor)
        server_cursor.closed = False
        conn._Connection__async_cursor = server_cursor

        plain_cursor = MagicMock()
        plain_cursor.closed = False

        conn.conn = MagicMock()
        conn.conn.cursor.return_value = plain_cursor
        conn.conn.info.user = 'postgres'
        conn.conn.info.host = 'localhost'
        conn.conn.info.dbname = 'testdb'

        with self.app.test_request_context():
            with patch(
                'pgadmin.utils.driver.psycopg3.connection.current_user',
                MagicMock(email='test@example.com')
            ), patch.object(Connection, '_Connection__cursor',
                            return_value=(True, server_cursor)):
                status, result = conn.execute_void(self.sql)

        self.assertTrue(status)
        self.assertIsNone(result)

        # It still runs on the throwaway, since a server-side cursor cannot
        # execute anything except through DECLARE ... CURSOR FOR.
        plain_cursor.execute.assert_called_once()
        server_cursor.execute.assert_not_called()

        # ... but the result set being read is left alone.
        self.assertIs(conn._Connection__async_cursor, server_cursor)
        self.assertEqual(conn.column_info, [{'name': 'x'}])
        self.assertEqual(conn.row_count, 1)


class IsTransactionControlTest(BaseTestGenerator):
    """Unit tests for the leading-keyword check that decides whether a
    statement is transaction control."""

    scenarios = [
        ('BEGIN', dict(sql='BEGIN;', expected=True)),
        ('COMMIT', dict(sql='COMMIT;', expected=True)),
        ('ROLLBACK', dict(sql='ROLLBACK;', expected=True)),
        ('lower case, no semicolon', dict(sql='commit', expected=True)),
        ('leading whitespace', dict(sql='  \n\tROLLBACK;', expected=True)),
        ('START TRANSACTION', dict(sql='START TRANSACTION;', expected=True)),
        ('ROLLBACK TO SAVEPOINT',
         dict(sql='ROLLBACK TO SAVEPOINT sp1;', expected=True)),
        ('SAVEPOINT', dict(sql='SAVEPOINT sp1;', expected=True)),
        ('RELEASE', dict(sql='RELEASE sp1;', expected=True)),
        ('a SELECT', dict(sql='SELECT pg_cancel_backend(1234);',
                          expected=False)),
        ('an INSERT', dict(sql='INSERT INTO t VALUES (1);', expected=False)),
        # "beginx" is not "begin".
        ('a keyword prefix', dict(sql='BEGINNING;', expected=False)),
        ('an empty statement', dict(sql='   ', expected=False)),
    ]

    def runTest(self):
        self.assertEqual(_is_transaction_control(self.sql), self.expected)
