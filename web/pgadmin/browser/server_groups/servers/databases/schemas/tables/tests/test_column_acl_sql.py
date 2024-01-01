##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os

from regression.python_test_utils.sql_template_test_base import \
    SQLTemplateTestBase
from regression.python_test_utils.template_helper import file_as_template


class TestColumnAclSql(SQLTemplateTestBase):
    scenarios = [
        # Fetching default URL for schema node.
        ('Test Column ACL SQL file', dict())
    ]

    def __init__(self):
        super().__init__()
        self.table_id = -1
        self.column_id = -1

    def test_setup(self, connection, cursor):
        cursor.execute("SELECT pg_class.oid AS table_id, "
                       "pg_attribute.attnum AS column_id "
                       "FROM pg_catalog.pg_class JOIN pg_attribute ON "
                       "attrelid=pg_class.oid "
                       "WHERE pg_class.relname='test_table'"
                       " AND pg_attribute.attname = 'some_column'")
        self.table_id, self.column_id = cursor.fetchone()

    def generate_sql(self, connection):
        file_path = os.path.join(os.path.dirname(__file__), "..", "templates",
                                 "columns", "sql")
        template_file = self.get_template_file(
            self.get_server_version(connection),
            file_path,
            "acl.sql")
        template = file_as_template(template_file)
        public_schema_id = 2200
        sql = template.render(scid=public_schema_id,
                              tid=self.table_id,
                              clid=self.column_id,
                              conn=connection
                              )

        return sql

    def assertions(self, fetch_result, descriptions):
        self.assertEqual(0, len(fetch_result))
