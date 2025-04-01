##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid

from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as directories_utils


class DirectoriesDeleteTestCase(BaseTestGenerator):
    """This class will delete the Directory"""
    scenarios = [
        ('Delete Directory', dict(url='/browser/directory/obj/'))
    ]

    def setUp(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        server_response = server_utils.connect_server(self, self.server_id)
        if server_response["info"] != "Server connected.":
            raise Exception("Could not connect to server to add directories.")
        if "type" in server_response["data"]:
            if server_response["data"]["type"] == "pg":
                message = "Directories are not supported by PG."
                self.skipTest(message)
            else:
                if server_response["data"]["version"] < 130000:
                    message = "Directories are not supported by EPAS " \
                              "12 and below."
                    self.skipTest(message)
        self.directory_name = "test_directory_delete%s" % \
                              str(uuid.uuid4())[1:8]
        self.directory_path = "/home/test_dir"
        self.directory_id = directories_utils.create_directories(
            self.server, self.directory_name, self.directory_path)

    def runTest(self):
        """This function will delete Directory."""
        directory_response = directories_utils.verify_directory(
            self.server, self.directory_name)
        if not directory_response:
            raise Exception("Could not find the Directory to fetch.")
        response = self.tester.delete(
            "{0}{1}/{2}/{3}".format(self.url, utils.SERVER_GROUP,
                                    self.server_id, self.directory_id),
            follow_redirects=True)
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        """This function delete the Directory from the database."""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        directories_utils.delete_directories(connection, self.directory_name)
