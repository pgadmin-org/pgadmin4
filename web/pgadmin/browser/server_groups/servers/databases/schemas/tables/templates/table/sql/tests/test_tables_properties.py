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


class TestTablesProperties(BaseTestGenerator):
    def runTest(self):
        """ This tests that all applicable sql template versions can fetch some ddl """
        with test_utils.Database(self.server) as (connection, database_name):
            test_utils.create_table(self.server, database_name, "test_table")

            cursor = connection.cursor()
            cursor.execute(u"""
            SELECT
                db.oid as did, datlastsysoid
            FROM
                pg_database db
            WHERE db.datname = '{0}'""".format(database_name)
                           )
            database_id, last_system_oid = cursor.fetchone()

            cursor = connection.cursor()
            cursor.execute("SELECT oid FROM pg_class where relname='test_table'")
            table_id = cursor.fetchone()[0]

            if connection.server_version < 90100:
                self.versions_to_test = ['default']
            else:
                self.versions_to_test = ['9.1_plus']

            for version in self.versions_to_test:
                template_file = os.path.join(os.path.dirname(__file__), "..", version, "properties.sql")
                template = file_as_template(template_file)

                public_schema_id = 2200
                sql = template.render(scid=public_schema_id,
                                      did=database_id,
                                      datlastsysoid=last_system_oid,
                                      tid=table_id
                                      )

                cursor = connection.cursor()
                cursor.execute(sql)
                fetch_result = cursor.fetchone()

                first_row = {}
                for index, description in enumerate(cursor.description):
                    first_row[description.name] = fetch_result[index]

                self.assertEqual('test_table', first_row['name'])
                # triggercount is sometimes returned as a string for some reason
                self.assertEqual(0, long(first_row['triggercount']))
                self.assertEqual(None, first_row['typname'])
                self.assertEqual([], first_row['coll_inherits'])
