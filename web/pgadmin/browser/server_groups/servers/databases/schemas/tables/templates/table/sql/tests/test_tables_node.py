import os
import sys

from jinja2 import BaseLoader
from jinja2 import Environment

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils

if sys.version_info[0] >= 3:
    long = int

class TestTablesNode(BaseTestGenerator):
    def runTest(self):
        """ This tests that all applicable sql template versions can fetch table names """
        with test_utils.Database(self.server) as (connection, database_name):
            test_utils.create_table(self.server, database_name, "test_table")

            if connection.server_version < 91000:
                self.versions_to_test = ['default']
            else:
                self.versions_to_test = ['default', '9.1_plus']

            for version in self.versions_to_test:
                template_file = os.path.join(os.path.dirname(__file__), "..", version, "nodes.sql")
                file_content = open(template_file, 'r').read()

                env = Environment(loader=SimpleTemplateLoader(file_content))

                template = env.get_template("")
                public_schema_id = 2200
                sql = template.render(scid=public_schema_id)

                cursor = connection.cursor()
                cursor.execute(sql)
                fetch_result = cursor.fetchall()

                first_row = {}
                for index, description in enumerate(cursor.description):
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


class SimpleTemplateLoader(BaseLoader):
    def __init__(self, file_content):
        self.file_content = file_content

    def get_source(self, *args):
        return self.file_content, "required-return-not-a-real-file.txt", True
