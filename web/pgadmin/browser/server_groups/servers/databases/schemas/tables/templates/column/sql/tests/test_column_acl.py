import os
import sys

from pgadmin.utils.driver import DriverRegistry
from regression.python_test_utils.template_helper import file_as_template

DriverRegistry.load_drivers()
from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils

if sys.version_info[0] >= 3:
    long = int


class TestColumnAcl(BaseTestGenerator):
    def runTest(self):
        """ When there are no permissions on the column, it returns an empty result """
        with test_utils.Database(self.server) as (connection, database_name):
            test_utils.create_table(self.server, database_name, "test_table")

            cursor = connection.cursor()
            cursor.execute("SELECT pg_class.oid as table_id, "
                           "pg_attribute.attnum as column_id "
                           "FROM pg_class join pg_attribute on attrelid=pg_class.oid "
                           "where pg_class.relname='test_table'"
                           " and pg_attribute.attname = 'some_column'")
            table_id, column_id = cursor.fetchone()

            if connection.server_version < 90100:
                self.versions_to_test = ['default']
            else:
                self.versions_to_test = ['9.1_plus']

            for version in self.versions_to_test:
                template_file = os.path.join(os.path.dirname(__file__), "..", version, "acl.sql")
                template = file_as_template(template_file)

                public_schema_id = 2200
                sql = template.render(scid=public_schema_id,
                                      tid=table_id,
                                      clid=column_id
                                      )

                cursor = connection.cursor()
                cursor.execute(sql)
                fetch_result = cursor.fetchall()
                self.assertEqual(0, len(fetch_result))