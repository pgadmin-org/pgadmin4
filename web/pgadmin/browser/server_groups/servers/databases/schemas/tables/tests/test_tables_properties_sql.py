##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
from regression.python_test_utils.template_helper import file_as_template
from regression.python_test_utils.sql_template_test_base import \
    SQLTemplateTestBase


class TestTablesPropertiesSql(SQLTemplateTestBase):
    scenarios = [
        ("This scenario tests that all applicable sql template versions can "
         "fetch some ddl", dict())
    ]

    def __init__(self):
        super(TestTablesPropertiesSql, self).__init__()
        self.database_id = -1
        self.last_system_oid = -1
        self.table_id = -1

    def assertions(self, fetch_result, descriptions):

        first_row = {}
        for index, description in enumerate(descriptions):
            first_row[description.name] = fetch_result[0][index]

        self.assertEqual('test_table', first_row['name'])
        # triggercount is sometimes returned as a string for some reason
        self.assertEqual(0, int(first_row['triggercount']))
        self.assertEqual(None, first_row['typname'])
        self.assertEqual([], first_row['coll_inherits'])

    def generate_sql(self, version):
        file_path = os.path.join(os.path.dirname(__file__), "..", "templates",
                                 "tables", "sql")
        template_file = self.get_template_file(version, file_path,
                                               "properties.sql")
        template = file_as_template(template_file)
        public_schema_id = 2200
        sql = template.render(scid=public_schema_id,
                              did=self.database_id,
                              datlastsysoid=self.last_system_oid,
                              tid=self.table_id
                              )
        return sql

    def test_setup(self, connection, cursor):
        cursor.execute(u"""
            SELECT
                db.oid as did, datlastsysoid
            FROM
                pg_database db
            WHERE db.datname = '{0}'""".format(self.database_name)
                       )
        self.database_id, self.last_system_oid = cursor.fetchone()

        cursor.execute("SELECT oid FROM pg_class where relname='test_table'")
        self.table_id = cursor.fetchone()[0]
