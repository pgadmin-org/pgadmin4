##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os

from regression.python_test_utils.sql_template_test_base import \
    SQLTemplateTestBase
from regression.python_test_utils.template_helper import file_as_template


class TestColumnPropertiesSql(SQLTemplateTestBase):
    scenarios = [
        # Fetching default URL for schema node.
        ('Test Column Properties SQL file', dict())
    ]

    def __init__(self):
        super().__init__()
        self.table_id = -1

    def test_setup(self, connection, cursor):
        cursor.execute("SELECT oid FROM pg_catalog.pg_class "
                       "where relname='test_table'")

        self.table_id = cursor.fetchone()[0]

    def generate_sql(self, version):
        file_path = os.path.join(os.path.dirname(__file__), "..", "templates",
                                 "columns", "sql")
        template_file = self.get_template_file(version, file_path,
                                               "properties.sql")
        template = file_as_template(template_file)
        public_schema_id = 2200
        sql = template.render(scid=public_schema_id,
                              tid=self.table_id
                              )

        return sql

    def assertions(self, fetch_result, descriptions):
        first_row = {}
        for index, description in enumerate(descriptions):
            first_row[description.name] = fetch_result[0][index]

        self.assertEqual('some_column', first_row['name'])
        self.assertEqual('character varying', first_row['cltype'])
        self.assertEqual(3, len(fetch_result))
