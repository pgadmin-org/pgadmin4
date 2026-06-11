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

import inspect

from pgadmin.utils.driver.psycopg3.cursor import AsyncDictCursor, DictCursor
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
