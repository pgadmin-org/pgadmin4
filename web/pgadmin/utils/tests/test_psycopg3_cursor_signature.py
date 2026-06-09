##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Regression test for DictCursor.execute() signature.

``psycopg.Connection.execute(query, params, *, prepare=None, binary=False)``
delegates to its underlying cursor as ``cur.execute(query, params,
prepare=prepare)``. The DictCursor in
``pgadmin.utils.driver.psycopg3.cursor`` must accept those kwargs or any
caller that uses the high-level ``Connection.execute`` path raises
``TypeError: execute() got an unexpected keyword argument 'prepare'``.
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
