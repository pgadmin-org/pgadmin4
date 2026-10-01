##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression test for DictCursor.execute() signature.

``psycopg.Cursor.execute`` exposes ``prepare`` and ``binary`` as keyword-only
parameters. For ``DictCursor`` (a ``psycopg.Cursor`` subclass) to remain
substitutable for the base cursor, its overridden ``execute`` must accept
those kwargs too.

The most visible failure mode is the ``Connection.execute`` path:
``psycopg.Connection.execute`` always forwards ``prepare=...`` to the
underlying cursor (``binary`` is handled by setting ``cur.format`` instead).
With a ``cursor_factory=DictCursor`` connection the forwarded ``prepare``
kwarg trips a narrowed ``DictCursor.execute`` signature with
``TypeError: execute() got an unexpected keyword argument 'prepare'``.
``binary`` doesn't break ``Connection.execute`` directly, but is asserted
here for full ``psycopg.Cursor`` signature parity.
"""

import asyncio
import inspect

from pgadmin.utils.driver.psycopg3.cursor import AsyncDictCursor, \
    AsyncDictServerCursor, DictCursor
from pgadmin.utils.route import BaseTestGenerator


class TestDictCursorExecuteSignature(BaseTestGenerator):
    """Verify (Async)DictCursor.execute exposes ``prepare`` and ``binary``."""

    scenarios = [
        ('DictCursor.execute accepts prepare/binary',
         dict(cls=DictCursor)),
        ('AsyncDictCursor.execute accepts prepare/binary',
         dict(cls=AsyncDictCursor)),
    ]

    def runTest(self):
        params = inspect.signature(self.cls.execute).parameters
        self.assertIn('prepare', params)
        self.assertIn('binary', params)
        # Must be keyword-only — psycopg passes them as kwargs.
        self.assertEqual(params['prepare'].kind,
                         inspect.Parameter.KEYWORD_ONLY)
        self.assertEqual(params['binary'].kind,
                         inspect.Parameter.KEYWORD_ONLY)


class TestAsyncDictServerCursorDropsPrepare(BaseTestGenerator):
    """
    ``AsyncDictServerCursor`` accepts ``prepare`` too (it inherits
    ``AsyncDictCursor.execute`` for ``psycopg.AsyncCursor`` substitutability),
    but must NOT forward it any further: the underlying
    ``psycopg.AsyncServerCursor.execute`` never accepts ``prepare`` (a
    server-side ``DECLARE CURSOR`` can't be a prepared statement) and raises
    ``TypeError`` on any unexpected keyword, even one whose value is
    ``None``. Without this, every server-cursor query fails with
    ``TypeError: keyword not supported: prepare``.
    """

    def runTest(self):
        captured = {}

        async def fake_execute(_self, query, params, **kwargs):
            captured['query'] = query
            captured['params'] = params
            captured.update(kwargs)
            return _self

        fake_underlying_cursor = type(
            'FakeServerCursor', (), {'execute': fake_execute})

        cur = AsyncDictServerCursor.__new__(AsyncDictServerCursor)
        cur.cursor = fake_underlying_cursor

        asyncio.run(
            cur._execute('SELECT 1', None, prepare=None, binary=None)
        )

        self.assertNotIn('prepare', captured)
        self.assertIn('binary', captured)
        self.assertEqual(captured['query'], 'SELECT 1')
