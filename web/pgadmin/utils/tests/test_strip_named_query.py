##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for _strip_named_query() in the SQL autocompleter.

named_query_regex used the class [A-z0-9\\-], whose A-z range also covers
the characters [ \\ ] ^ _ and ` (CodeQL py/overly-large-range). The class is
now spelt [A-Za-z0-9_\\-], so letters, digits, underscores and hyphens in a
saved query name must still be stripped, whilst the punctuation that only
matched by accident must not be.
"""

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.sqlautocomplete.sqlcompletion import _strip_named_query


class StripNamedQueryTestCase(BaseTestGenerator):
    """_strip_named_query() removes a leading '\\ns <name>' command."""

    scenarios = [
        ('A lowercase name is stripped',
         dict(value='\\ns zzz SELECT 1', expected='SELECT 1')),
        ('Leading whitespace is stripped too',
         dict(value='  \\ns zzz SELECT 1', expected='SELECT 1')),
        ('An uppercase name is stripped',
         dict(value='\\ns MyQuery SELECT 1', expected='SELECT 1')),
        ('Digits and hyphens are stripped',
         dict(value='\\ns q-01 SELECT 1', expected='SELECT 1')),
        ('An underscore is still stripped',
         dict(value='\\ns my_query SELECT 1', expected='SELECT 1')),
        ('Text without the command is untouched',
         dict(value='SELECT 1', expected='SELECT 1')),
    ] + [
        ('A name containing %r is no longer stripped' % ch,
         dict(value='\\ns a%sb SELECT 1' % ch,
              expected='\\ns a%sb SELECT 1' % ch))
        for ch in '[\\]^`'
    ]

    def runTest(self):
        self.assertEqual(_strip_named_query(self.value), self.expected)
