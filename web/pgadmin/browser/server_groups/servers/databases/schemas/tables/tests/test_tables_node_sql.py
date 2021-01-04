##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
from regression.python_test_utils.sql_template_test_base import \
    SQLTemplateTestBase
from regression.python_test_utils.template_helper import file_as_template


class TestTablesNodeSql(SQLTemplateTestBase):
    scenarios = [
        ("This scenario tests that all applicable sql template versions can "
         "fetch table names", dict())
    ]

    def test_setup(self, connection, cursor):
        pass

    def generate_sql(self, version):
        file_path = os.path.join(os.path.dirname(__file__), "..", "templates",
                                 "tables", "sql")
        template_file = self.get_template_file(version, file_path,
                                               "nodes.sql")
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

        self.assertIsNotNone(int(oid))
        self.assertEqual('test_table', name)
        # triggercount is sometimes returned as a string for some reason
        self.assertEqual(0, int(triggercount))
        self.assertIsNotNone(int(has_enable_triggers))
