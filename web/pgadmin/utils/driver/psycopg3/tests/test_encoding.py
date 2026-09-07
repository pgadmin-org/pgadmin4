##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Unit tests for pgadmin.utils.driver.psycopg3.encoding.

These guard against psycopg restructuring its private
psycopg._encodings module (e.g. 3.3.5 changed _py_codecs from a dict
to a tuple of alias groups, breaking configure_driver_encodings()).
They don't need a live database connection.
"""

import psycopg

from pgadmin.utils.driver.psycopg3.encoding import get_encoding, \
    configure_driver_encodings
from pgadmin.utils.route import BaseTestGenerator


class TestEncoding(BaseTestGenerator):
    """Validate get_encoding()/configure_driver_encodings() against
    whatever shape the installed psycopg version's encoding tables
    have."""

    scenarios = [
        ('UTF8 maps to the utf-8 python codec',
         dict(key='UTF8', expected=['utf-8', 'utf-8'])),
        ('LATIN1 maps to the iso8859-1 python codec',
         dict(key='LATIN1', expected=['ISO88591', 'iso8859-1'])),
        ('SQL_ASCII falls back to the pgAdmin-only override',
         dict(key='SQL_ASCII', expected=['utf-8', 'utf-8'])),
        ('EUC_TW falls back to the pgAdmin-only override',
         dict(key='EUC_TW', expected=['utf-8', 'utf-8'])),
        ('UNICODE falls back to the pgAdmin-only override',
         dict(key='UNICODE', expected=['utf-8', 'utf-8'])),
        ('the ascii special-case resolves via raw_unicode_escape',
         dict(key='ascii', expected=['SQLASCII', 'raw-unicode-escape'])),
    ]

    def setUp(self):
        # No DB connection needed for this test.
        pass

    def runTest(self):
        encodings = {}
        configure_driver_encodings(encodings)

        with self.app.app_context():
            self.assertEqual(get_encoding(self.key), self.expected)

        # py_codecs/pg_codecs must stay plain dicts and stay in sync,
        # regardless of how psycopg represents its internal encoding
        # table (dict in <=3.3.4, tuple-of-aliases in >=3.3.5).
        self.assertIsInstance(psycopg._encodings.py_codecs, dict)
        self.assertIsInstance(psycopg._encodings.pg_codecs, dict)
        # pg_codecs is the reverse of py_codecs (python codec -> one of
        # its PG names); every value it holds must round-trip back to
        # the same python codec through py_codecs.
        for python_codec, pg_name in psycopg._encodings.pg_codecs.items():
            self.assertEqual(
                psycopg._encodings.py_codecs.get(pg_name), python_codec)
