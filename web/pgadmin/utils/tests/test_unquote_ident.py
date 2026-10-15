##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for unquote_ident().

Identifiers arrive from catalogue functions such as pg_get_indexdef() quoted
only when they need to be, with any embedded double quote doubled. The
previous str.strip('"') removed the outer quotes but left the doubled ones
behind, so a column named 'col"x' was displayed as 'col""x' (#6481). An
expression must survive untouched, which strip() also failed at.
"""

from pgadmin.utils import unquote_ident
from pgadmin.utils.route import BaseTestGenerator


class UnquoteIdentTestCase(BaseTestGenerator):
    """unquote_ident() must reverse quote_ident() and leave the rest alone."""

    scenarios = [
        ('An unquoted name is returned as is',
         dict(value='colname', expected='colname')),
        ('Outer quotes are removed',
         dict(value='"Col"', expected='Col')),
        ('A doubled inner quote is unescaped',
         dict(value='"col""x"', expected='col"x')),
        ('Several doubled inner quotes are unescaped',
         dict(value='"a""b""c"', expected='a"b"c')),
        ('A name that is nothing but quotes is unescaped',
         dict(value='""""', expected='"')),
        ('A quoted name containing spaces keeps them',
         dict(value='"my column"', expected='my column')),
        ('An unquoted expression is untouched',
         dict(value='(a || b)', expected='(a || b)')),
        ('An expression of quoted names is untouched',
         dict(value='"a" || "b"', expected='"a" || "b"')),
        ('A lone quote is untouched',
         dict(value='"', expected='"')),
        ('An empty string is untouched',
         dict(value='', expected='')),
        ('None is untouched',
         dict(value=None, expected=None)),
    ]

    def setUp(self):
        # A pure string function: no server connection required.
        pass

    def runTest(self):
        self.assertEqual(unquote_ident(self.value), self.expected)
