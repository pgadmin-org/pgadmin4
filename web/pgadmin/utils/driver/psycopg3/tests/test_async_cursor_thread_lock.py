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
from unittest.mock import MagicMock, patch

from psycopg import InterfaceError

from pgadmin.utils.driver.psycopg3.cursor import AsyncDictCursor, \
    _connection_lock
from pgadmin.utils.route import BaseTestGenerator


class _FakeConnection:
    """Stands in for a psycopg AsyncConnection; only identity matters."""


def _cursor_on(conn):
    cur = AsyncDictCursor.__new__(AsyncDictCursor)
    cur._conn = conn
    return cur


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
    """Calls on cursors sharing a connection hold one lock per connection."""

    def runTest(self):
        conn, other_conn = _FakeConnection(), _FakeConnection()
        cur1, cur2 = _cursor_on(conn), _cursor_on(conn)

        self.assertIs(_connection_lock(cur1.connection),
                      _connection_lock(cur2.connection))
        self.assertIsNot(_connection_lock(conn),
                         _connection_lock(other_conn))

        seen = {}

        async def probe():
            seen['same_conn'] = _held_by_another_thread(
                _connection_lock(conn))
            seen['other_conn'] = _held_by_another_thread(
                _connection_lock(other_conn))
            return 'done'

        self.assertEqual(cur2._run(probe()), 'done')
        # Whilst one cursor's call runs, no other thread can use the same
        # connection, but a different connection is unaffected.
        self.assertTrue(seen['same_conn'])
        self.assertFalse(seen['other_conn'])
        # The lock is released once the call returns.
        self.assertFalse(_held_by_another_thread(_connection_lock(conn)))


class AsyncCursorExecuteRuntimeErrorTest(BaseTestGenerator):
    """A RuntimeError from execute() is reported, not silently dropped."""

    def runTest(self):
        cur = _cursor_on(_FakeConnection())

        async def failing_execute(*args, **kwargs):
            raise RuntimeError('bound to a different event loop')

        with patch.object(cur, '_execute', failing_execute), \
                patch('pgadmin.utils.driver.psycopg3.cursor.current_app',
                      new=MagicMock()):
            with self.assertRaises(InterfaceError) as ctx:
                cur.execute('SELECT 1')

        self.assertIn('different event loop', str(ctx.exception))
