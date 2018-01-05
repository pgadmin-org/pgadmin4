##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils
from pgadmin.utils.driver import DriverRegistry

DriverRegistry.load_drivers()


class SQLTemplateTestBase(BaseTestGenerator):
    scenarios = [
        ("parent test class", dict(ignore_test=True))
    ]

    def __init__(self):
        super(SQLTemplateTestBase, self).__init__()
        self.database_name = -1
        self.versions_to_test = -1

    def test_setup(self, connection, cursor):
        pass

    def generate_sql(self, version):
        pass

    def assertions(self, fetch_result, descriptions):
        pass

    def runTest(self):
        if hasattr(self, "ignore_test"):
            return

        with test_utils.Database(self.server) as (connection, database_name):
            test_utils.create_table(self.server, database_name, "test_table")
            self.database_name = database_name

            if connection.server_version < 90100:
                self.versions_to_test = ['default']
            else:
                self.versions_to_test = ['9.1_plus']

            cursor = connection.cursor()
            self.test_setup(connection, cursor)

            for version in self.versions_to_test:
                sql = self.generate_sql(version)

                cursor = connection.cursor()
                cursor.execute(sql)
                fetch_result = cursor.fetchall()

                self.assertions(fetch_result, cursor.description)
