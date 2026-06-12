##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for pgadmin.utils.db_utils.normalize_database_uri."""

import unittest

from pgadmin.utils.db_utils import normalize_database_uri
from pgadmin.utils.route import BaseTestGenerator


class TestNormalizeDatabaseUri(BaseTestGenerator):
    """normalize_database_uri must rewrite bare postgres(ql):// to
    postgresql+psycopg:// and leave everything else unchanged."""

    # Bypass the server-connection setUp in BaseTestGenerator.
    def setUp(self):
        unittest.TestCase.setUp(self)

    scenarios = [
        (
            'postgres:// is rewritten to postgresql+psycopg://',
            {
                'uri': 'postgres://u:p@h/db',
                'expected': 'postgresql+psycopg://u:p@h/db',
            }
        ),
        (
            'postgresql:// is rewritten to postgresql+psycopg://',
            {
                'uri': 'postgresql://u:p@h/db',
                'expected': 'postgresql+psycopg://u:p@h/db',
            }
        ),
        (
            'postgresql+psycopg:// is returned unchanged (idempotent)',
            {
                'uri': 'postgresql+psycopg://u:p@h/db',
                'expected': 'postgresql+psycopg://u:p@h/db',
            }
        ),
        (
            'sqlite:/// is returned unchanged',
            {
                'uri': 'sqlite:///path/to/db.sqlite3',
                'expected': 'sqlite:///path/to/db.sqlite3',
            }
        ),
    ]

    def runTest(self):
        self.assertEqual(normalize_database_uri(self.uri), self.expected)
