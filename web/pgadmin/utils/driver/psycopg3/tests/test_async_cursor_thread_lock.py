##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression tests for #7155: AsyncDictCursor must serialise use of a
connection across threads.

Every AsyncDictCursor call runs in its own event loop via asyncio.run(),
whilst psycopg guards the connection with an asyncio.Lock that only works
within one loop. When two threads (for example the Query Tool's background
query thread and a request thread) used the same connection at once, the
lock was left bound to a dead loop with a stuck waiter, and every later
execute() on that connection failed with "is bound to a different event
loop". That error was swallowed, so the Query Tool showed an empty or stale
result ("Total rows: 0 of 10")."""

import threading
from unittest.mock import MagicMock, PropertyMock, patch

from psycopg import InterfaceError

from pgadmin.utils.driver.psycopg3.cursor import AsyncDictCursor, \
    _connection_lock
from pgadmin.utils.route import BaseTestGenerator


class _FakeConnection:
    """Stands in for a psycopg AsyncConnection; only identity matters."""


def _cursor_on(conn):
    """
    Return an AsyncDictCursor whose connection property returns conn. The
    cursor is not initialised, since these tests only need its connection.
    """
    patcher = patch.object(AsyncDictCursor, 'connection',
                           new_callable=PropertyMock, return_value=conn)
    patcher.start()
    return patcher, AsyncDictCursor.__new__(AsyncDictCursor)


def _held_by_another_thread(lock):
    """Return True if a different thread cannot take the lock now."""
    result = {}

    def try_acquire():
        got = lock.acquire(blocking=False)
        if got:
            lock.release()
        result['held'] = not got

    t = threading.Thread(target=try_acquire)
    t.start()
    t.join()
    return result['held']


class AsyncCursorConnectionLockTest(BaseTestGenerator):
    """A cursor call holds its connection's lock, and only that one."""

    def runTest(self):
        conn, other_conn = _FakeConnection(), _FakeConnection()
        patcher, cur = _cursor_on(conn)
        self.addCleanup(patcher.stop)

        self.assertIs(_connection_lock(conn), _connection_lock(conn))
        self.assertIsNot(_connection_lock(conn),
                         _connection_lock(other_conn))

        seen = {}

        async def probe():
            seen['same_conn'] = _held_by_another_thread(
                _connection_lock(conn))
            seen['other_conn'] = _held_by_another_thread(
                _connection_lock(other_conn))
            return 'done'

        self.assertEqual(cur._run(probe()), 'done')
        # Whilst one cursor's call runs, no other thread can use the same
        # connection, but a different connection is unaffected.
        self.assertTrue(seen['same_conn'])
        self.assertFalse(seen['other_conn'])
        # The lock is released once the call returns.
        self.assertFalse(_held_by_another_thread(_connection_lock(conn)))


class AsyncCursorExecuteRuntimeErrorTest(BaseTestGenerator):
    """A RuntimeError from execute() is reported, not silently dropped."""

    def runTest(self):
        patcher, cur = _cursor_on(_FakeConnection())
        self.addCleanup(patcher.stop)

        async def failing_execute(*args, **kwargs):
            raise RuntimeError('bound to a different event loop')

        with patch.object(cur, '_execute', failing_execute), \
                patch('pgadmin.utils.driver.psycopg3.cursor.current_app',
                      new=MagicMock()):
            with self.assertRaises(InterfaceError) as ctx:
                cur.execute('SELECT 1')

        self.assertIn('different event loop', str(ctx.exception))
