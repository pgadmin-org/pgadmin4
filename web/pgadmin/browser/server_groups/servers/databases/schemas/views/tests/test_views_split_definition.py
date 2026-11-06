##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.browser.server_groups.servers.databases.schemas.views import \
    ViewNode


class ViewsSplitDefinitionTestCase(BaseTestGenerator):
    """The select list compared to decide whether a view must be dropped
    and re-created ignores reformatting, but notices changes to quoted
    identifiers and is not cut short by identifiers containing 'from'."""

    scenarios = [
        ('Reformat with different case and whitespace is ignored', dict(
            old=' SELECT id,\n    upper(a) AS ua,\n    (d)::text AS ds\n'
                '   FROM t1 t;',
            new='SELECT\n\tid,\n\tUPPER(a) AS ua,\n\t(d)::TEXT AS ds\n'
                'FROM\n\tt1 t;',
            same=True)),
        ('Case change in a quoted identifier is noticed', dict(
            old='SELECT 1 AS "Name" FROM t1',
            new='SELECT 1 AS "NAME" FROM t1',
            same=False)),
        ('Punctuation change in a quoted identifier is noticed', dict(
            old='SELECT 1 AS "a-b" FROM t1',
            new='SELECT 1 AS "ab" FROM t1',
            same=False)),
        ('Quoting an identifier that needs no quotes is ignored', dict(
            old='SELECT id, name FROM t1',
            new='SELECT "id", "name" FROM t1',
            same=True)),
        ('Column removed after one named like FROM is noticed', dict(
            old='SELECT a AS fromage, b FROM t1',
            new='SELECT a AS fromage FROM t1',
            same=False)),
        ('Column removed after valid_from is noticed', dict(
            old='SELECT id, valid_from, name FROM t1',
            new='SELECT id, valid_from FROM t1',
            same=False)),
        ('FROM inside a string literal does not split', dict(
            old="SELECT 'x FROM y' AS a, b FROM t1",
            new="SELECT 'x FROM y' AS a FROM t1",
            same=False)),
        ('FROM inside a block comment does not split', dict(
            old='SELECT a /* from */, b FROM t1',
            new='SELECT a /* from */ FROM t1',
            same=False)),
        ('FROM inside a nested block comment does not split', dict(
            old='SELECT a /* x /* y */ from */, b FROM t1',
            new='SELECT a /* x /* y */ from */ FROM t1',
            same=False)),
        ('FROM inside a line comment does not split', dict(
            old='SELECT a -- from\n, b FROM t1',
            new='SELECT a -- from\nFROM t1',
            same=False)),
        ('Adding or removing a comment is ignored', dict(
            old='SELECT a, /* note */ b -- the end\nFROM t1',
            new='SELECT a, b FROM t1',
            same=True)),
        ('FROM inside a dollar-quoted string does not split', dict(
            old='SELECT $q$ from $$ \' $q$ AS a, b FROM t1',
            new='SELECT $q$ from $$ \' $q$ AS a FROM t1',
            same=False)),
        ('FROM inside an E string with escapes does not split', dict(
            old="SELECT E'it\\'s from' AS a, b FROM t1",
            new="SELECT E'it\\'s from' AS a FROM t1",
            same=False)),
        ('A $ inside an identifier does not start a dollar quote', dict(
            old='SELECT a$q$, b FROM t1',
            new='SELECT a$q$ FROM t1',
            same=False)),
    ]

    def runTest(self):
        old_def = ViewNode._split_definition(self.old)
        new_def = ViewNode._split_definition(self.new)
        self.assertEqual(len(old_def), 2)
        self.assertEqual(old_def[0] == new_def[0], self.same)
