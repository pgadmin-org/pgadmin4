##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import sys

from regression.python_test_utils.sql_template_test_base import \
    SQLTemplateTestBase
from regression.python_test_utils.template_helper import file_as_template

if sys.version_info[0] >= 3:
    long = int


class TestTablesNodeSql(SQLTemplateTestBase):
    scenarios = [
        ("This scenario tests that all applicable sql template versions can "
         "fetch table names", dict())
    ]

    def test_setup(self, connection, cursor):
        pass

    def generate_sql(self, version):
        template_file = self.get_template_file(version, "nodes.sql")
        template = file_as_template(template_file)
        public_schema_id = 2200
        sql = template.render(scid=public_schema_id)
        return sql

    def assertions(self, fetch_result, descriptions):

        first_row = {}
        for index, description in enumerate(descriptions):
            first_row[description.name] = fetch_result[0][index]

        oid = first_row['oid']
        name = first_row['name']
        triggercount = first_row['triggercount']
        has_enable_triggers = first_row['has_enable_triggers']

        self.assertIsNotNone(long(oid))
        self.assertEqual('test_table', name)
        # triggercount is sometimes returned as a string for some reason
        self.assertEqual(0, long(triggercount))
        self.assertIsNotNone(long(has_enable_triggers))

    @staticmethod
    def get_template_file(version, filename):
        return os.path.join(
            os.path.dirname(__file__), "..", "templates", "table", "sql",
            version, filename
        )
