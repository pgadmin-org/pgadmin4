##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator


class IEIdentifierBackslashTest(BaseTestGenerator):
    """Test the _identifier_has_unsafe_char function.

    A schema, table or column name is wrapped with qtIdent() and
    interpolated into psql's \\copy command. qtIdent() doubles an embedded
    double quote but leaves a backslash untouched, while psql's \\copy
    parser treats a backslash inside a double-quoted identifier as an
    escape, so a name with a backslash can end the identifier early and
    break out of the command (CWE-78, the same class as the query guard).
    Such a name is rejected outright.
    """

    scenarios = [
        ('No identifiers', dict(data={}, expected=False)),
        ('Plain schema and table', dict(
            data=dict(schema='public', table='t'), expected=False)),
        ('Doubled-quote name is fine', dict(
            data=dict(schema='public', table='a"b'), expected=False)),
        ('Star force-quote is fine', dict(
            data=dict(force_quote_columns=['*']), expected=False)),
        ('Backslash in the schema name', dict(
            data=dict(schema='pub\\lic', table='t'), expected=True)),
        ('Trailing backslash in the table name', dict(
            data=dict(schema='public', table='t\\'), expected=True)),
        ('Backslash in a column name', dict(
            data=dict(columns=['ok', 'c\\']), expected=True)),
        ('Backslash in a not-null column', dict(
            data=dict(not_null_columns=['c\\']), expected=True)),
        ('Backslash in a null column', dict(
            data=dict(null_columns=['c\\']), expected=True)),
        ('Backslash in a force-quote column', dict(
            data=dict(force_quote_columns=['c\\']), expected=True)),
        # A column key sent as a string is iterated character by character
        # by columns_to_string(), so a backslash in it still reaches the
        # command.
        ('Backslash in a string column value', dict(
            data=dict(columns='x\\'), expected=True)),
        ('Backslash in a dict column value', dict(
            data=dict(columns={'c\\': 1}), expected=True)),
        ('Null byte in the table name', dict(
            data=dict(table='t\x00'), expected=True)),
        ('A column list with a star is fine', dict(
            data=dict(columns=['*']), expected=False)),
        ('None schema and table are fine', dict(
            data=dict(schema=None, table=None), expected=False)),
    ]

    def runTest(self):
        from pgadmin.tools.import_export import \
            _identifier_has_unsafe_char
        self.assertEqual(
            _identifier_has_unsafe_char(self.data), self.expected,
            "data: {0}".format(self.data))
