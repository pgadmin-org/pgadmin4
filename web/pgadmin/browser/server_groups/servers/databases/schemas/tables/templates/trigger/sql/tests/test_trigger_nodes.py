##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import sys

from pgadmin.utils.driver import DriverRegistry
from regression.python_test_utils.template_helper import file_as_template

DriverRegistry.load_drivers()
from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils

if sys.version_info[0] >= 3:
    long = int


class TestTriggerNodes(BaseTestGenerator):
    def runTest(self):
        """ When there are no triggers, it returns an empty result """
        with test_utils.Database(self.server) as (connection, database_name):
            test_utils.create_table(self.server, database_name, "test_table")

            cursor = connection.cursor()
            cursor.execute("SELECT pg_class.oid AS table_id "
                           "FROM pg_class "
                           "WHERE pg_class.relname='test_table'")
            table_id = cursor.fetchone()[0]

            if connection.server_version < 90100:
                self.versions_to_test = ['default']
            else:
                self.versions_to_test = ['9.1_plus']

            for version in self.versions_to_test:
                template_file = os.path.join(os.path.dirname(__file__), "..", version, "nodes.sql")

                template = file_as_template(template_file)

                sql = template.render(tid=table_id)

                cursor = connection.cursor()
                cursor.execute(sql)
                fetch_result = cursor.fetchall()
                self.assertEqual(0, len(fetch_result))
