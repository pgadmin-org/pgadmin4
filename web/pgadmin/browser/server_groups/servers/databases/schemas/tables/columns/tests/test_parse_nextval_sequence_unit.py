##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Unit tests for parse_nextval_sequence(), covering the schema-qualified
identifier it extracts out of a column's ``nextval(...)`` default, and in
particular the SQL string-literal quote-doubling PostgreSQL applies when
the sequence name itself contains a single quote (#10318).
"""

from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    columns.utils import parse_nextval_sequence
from pgadmin.utils.route import BaseTestGenerator


class TestParseNextvalSequence(BaseTestGenerator):
    """Unit tests for parse_nextval_sequence()."""

    scenarios = [
        ('No default value returns None',
         dict(test_method='test_none_defval')),
        ('A non-nextval default returns None',
         dict(test_method='test_non_nextval_defval')),
        ('A plain schema-qualified sequence name is extracted verbatim',
         dict(test_method='test_plain_sequence_name')),
        ('A sequence name containing a single quote has the doubled '
         'quote decoded back to one',
         dict(test_method='test_quoted_sequence_name_with_embedded_quote')),
    ]

    def runTest(self):
        getattr(self, self.test_method)()

    def test_none_defval(self):
        self.assertIsNone(parse_nextval_sequence(None))

    def test_non_nextval_defval(self):
        self.assertIsNone(parse_nextval_sequence('1'))

    def test_plain_sequence_name(self):
        seq_name = parse_nextval_sequence(
            "nextval('public.t_id_seq'::regclass)")
        self.assertEqual(seq_name, 'public.t_id_seq')

    def test_quoted_sequence_name_with_embedded_quote(self):
        # PostgreSQL renders the sequence "id'seq" as the double-quoted
        # identifier "id'seq", and then - because the whole thing is the
        # argument of a string literal - doubles the embedded single
        # quote: nextval('public."id''seq"'::regclass). The extracted
        # identifier must have that doubling undone, since it is spliced
        # verbatim into CREATE SEQUENCE / ALTER SEQUENCE DDL rather than
        # back into a string literal.
        seq_name = parse_nextval_sequence(
            'nextval(\'public."id\'\'seq"\'::regclass)')
        self.assertEqual(seq_name, 'public."id\'seq"')
