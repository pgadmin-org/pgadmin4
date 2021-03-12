##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
from pgadmin.utils.driver import DriverRegistry
from regression.python_test_utils.template_helper import file_as_template

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils

DriverRegistry.load_drivers()


class TestColumnForeignKeyGetConstraintCols(BaseTestGenerator):
    scenarios = [
        ("Test foreign key get constraint with no foreign key properties on"
         " the column", dict())
    ]

    def runTest(self):
        """ When there are no foreign key properties on the column, it returns
        an empty result """
        with test_utils.Database(self.server) as (connection, database_name):
            test_utils.create_table(self.server, database_name, "test_table")

            cursor = connection.cursor()
            cursor.execute("SELECT pg_class.oid as table_id, "
                           "pg_attribute.attnum as column_id "
                           "FROM pg_catalog.pg_class join pg_attribute on "
                           "attrelid=pg_class.oid "
                           "where pg_class.relname='test_table'"
                           " and pg_attribute.attname = 'some_column'")
            table_id, column_id = cursor.fetchone()

            if connection.server_version < 90100:
                self.versions_to_test = ['default']
            else:
                self.versions_to_test = ['9.1_plus']

            for version in self.versions_to_test:
                template_file = os.path.join(
                    os.path.dirname(__file__), "..", version,
                    "properties.sql"
                )
                template = file_as_template(template_file)

                sql = template.render(
                    tid=table_id,
                    cid=column_id)

                cursor = connection.cursor()
                cursor.execute(sql)
                fetch_result = cursor.fetchall()
                self.assertEqual(0, len(fetch_result))
