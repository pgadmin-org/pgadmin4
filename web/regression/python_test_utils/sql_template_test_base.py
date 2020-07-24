##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils
from pgadmin.utils.driver import DriverRegistry
from pgadmin.utils.versioned_template_loader \
    import get_version_mapping_directories

DriverRegistry.load_drivers()


class SQLTemplateTestBase(BaseTestGenerator):
    scenarios = [
        ("parent test class", dict(ignore_test=True))
    ]

    def __init__(self):
        super(SQLTemplateTestBase, self).__init__()
        self.database_name = -1

    def test_setup(self, connection, cursor):
        # To be implemented by child classes
        pass

    def generate_sql(self, version):
        # To be implemented by child classes
        pass

    def assertions(self, fetch_result, descriptions):
        # To be implemented by child classes
        pass

    def runTest(self):
        if hasattr(self, "ignore_test"):
            return

        with test_utils.Database(self.server) as (connection, database_name):
            test_utils.create_table(self.server, database_name, "test_table")
            self.database_name = database_name

            cursor = connection.cursor()
            self.test_setup(connection, cursor)

            sql = self.generate_sql(connection.server_version)

            cursor = connection.cursor()
            cursor.execute(sql)
            fetch_result = cursor.fetchall()

            self.assertions(fetch_result, cursor.description)

    def get_template_file(self, version, file_path, filename):
        """
        This function check the specified file in the server mapping directory
        and if file exists then return that path.
        :param version:
        :param file_path:
        :param filename:
        :return:
        """
        # Iterate all the mapping directories and check the file is exist
        # in the specified folder. If it exists then return the path.
        for directory in get_version_mapping_directories(self.server['type']):
            if directory['number'] > version:
                continue

            template_path = '/'.join([
                file_path,
                directory['name'],
                filename
            ])

            if os.path.exists(template_path):
                return template_path
