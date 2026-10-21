##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for the statistics nodes.sql template (#10310).

pgAdmin renders its SQL templates with Jinja's trim_blocks enabled, which
removes the newline after every block tag. nodes.sql used to end its WHERE
clause with a conditional, so with neither a statistics id nor schema_diff
set - which is exactly what the Object Explorer sends when it expands the
Statistics collection - the rendered SQL read "...::oidORDER BY s.stxname"
and the server rejected it, leaving the node empty.

The template is rendered through the application's own Jinja environment,
via the versioned template loader, and executed against the server.
"""

import re

from flask import render_template

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils

# A keyword that follows a value with no whitespace between them.
GLUED_KEYWORD = re.compile(r'[^\s](ORDER BY|GROUP BY|LIMIT)\b')


class StatisticsNodesTemplateTestCase(BaseTestGenerator):
    """nodes.sql must be valid SQL for every combination it is rendered with."""

    scenarios = [
        ('Listing the statistics of a schema (Object Explorer)',
         dict(params=dict(scid=2200), expect_in=['s.stxnamespace = 2200'])),
        ('Looking one object up in its schema',
         dict(params=dict(scid=2200, stid=1),
              expect_in=['s.stxnamespace = 2200', 's.oid = 1'])),
        ('Looking one object up by OID alone',
         dict(params=dict(stid=1), expect_in=['s.oid = 1'])),
        ('Listing a schema for Schema Diff',
         dict(params=dict(scid=2200, schema_diff=True),
              expect_in=['s.stxnamespace = 2200', 'deptype = \'e\''])),
    ]

    def setUp(self):
        # No pgAdmin server registration is needed: this exercises the SQL,
        # so it talks to the server directly.
        self.connection = utils.get_db_connection(
            self.server['db'], self.server['username'],
            self.server['db_password'], self.server['host'],
            self.server['port'], self.server['sslmode'])
        cursor = self.connection.cursor()
        cursor.execute("SELECT current_setting('server_version_num')::int")
        self.server_version = cursor.fetchone()[0]

    def tearDown(self):
        self.connection.close()

    def runTest(self):
        if self.server_version < 140000:
            self.skipTest('Extended statistics objects in the tree need '
                          'PostgreSQL 14 or later.')

        template_path = 'statistics/sql/#{0}#'.format(self.server_version)
        with self.app.app_context():
            sql = render_template(
                "/".join([template_path, 'nodes.sql']), **self.params)

        self.assertIsNone(
            GLUED_KEYWORD.search(sql),
            'A clause has run into the keyword after it:\n%s' % sql)
        for fragment in self.expect_in:
            self.assertIn(fragment, sql)

        # The real test of "valid SQL" is the server accepting it.
        cursor = self.connection.cursor()
        cursor.execute(sql)
        cursor.fetchall()
