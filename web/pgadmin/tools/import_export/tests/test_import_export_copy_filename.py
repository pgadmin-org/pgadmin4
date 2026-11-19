##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os

from jinja2 import Environment, FileSystemLoader

from pgadmin.utils.route import BaseTestGenerator

TEMPLATES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.realpath(__file__))),
    'templates', 'import_export', 'sql')


class IECopyFilenameLiteralTest(BaseTestGenerator):
    """Test the _copy_filename_literal function.

    psql parses the file name of \\copy itself: the token is optionally
    wrapped in single quotes, an embedded single quote is doubled, and
    there are no backslash escapes and no E'...' form. A backslash must
    therefore reach psql unchanged, in a plain '...' literal.
    """

    scenarios = [
        ('Plain file name', dict(
            filename='/tmp/a.csv', expected="'/tmp/a.csv'")),
        ('File name with a space', dict(
            filename='/tmp/a b.csv', expected="'/tmp/a b.csv'")),
        ('Backslash is left as it is', dict(
            filename='/tmp/a\\b.csv', expected="'/tmp/a\\b.csv'")),
        ('Trailing backslash does not escape the closing quote', dict(
            filename='/tmp/a\\', expected="'/tmp/a\\'")),
        ('Single quote is doubled', dict(
            filename="/tmp/a'b.csv", expected="'/tmp/a''b.csv'")),
        ('Backslash before a single quote', dict(
            filename="/tmp/a\\'b.csv", expected="'/tmp/a\\''b.csv'")),
        ('File descriptor path', dict(
            filename='/dev/fd/7', expected="'/dev/fd/7'")),
    ]

    def runTest(self):
        from pgadmin.tools.import_export import _copy_filename_literal
        self.assertEqual(
            _copy_filename_literal(self.filename), self.expected)


class IECopyFilenameTemplateTest(BaseTestGenerator):
    """The \\copy templates must write the file name they are given as it
    is, and must not pass it through qtLiteral(), which turns a value
    containing a backslash into an E'...' literal that psql reads as a
    file named "E".
    """

    scenarios = [
        ('Export, {0} template'.format(version), dict(
            version=version, is_import=False))
        for version in ('default', '16_plus', '17_plus')
    ] + [
        ('Import, {0} template'.format(version), dict(
            version=version, is_import=True))
        for version in ('default', '16_plus', '17_plus')
    ]

    def runTest(self):
        from pgadmin.tools.import_export import _copy_filename_literal

        env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))
        env.filters['qtIdent'] = lambda conn, *names: '.'.join(names)
        env.filters['qtLiteral'] = \
            lambda value, conn: 'qtLiteral({0})'.format(value)

        filename = '/tmp/a\\b.csv'
        data = dict(
            schema='public', table='t', is_import=self.is_import,
            filename=filename, format='csv', delimiter=',',
            encoding='UTF8')
        cmd = env.get_template(self.version + '/cmd.sql').render(
            conn=None, data=data, columns=None,
            filename=_copy_filename_literal(filename),
            not_null_columns=None, null_columns=None,
            force_quote_columns=None)

        self.assertIn(
            "{0} '/tmp/a\\b.csv' WITH(FORMAT csv".format(
                'FROM' if self.is_import else 'TO'), cmd)
        self.assertNotIn("E'/tmp", cmd)
        self.assertNotIn('qtLiteral(/tmp', cmd)
        # The option values are parsed by the server and keep qtLiteral().
        self.assertIn('DELIMITER qtLiteral(,)', cmd)
