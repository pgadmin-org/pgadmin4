##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid
import json

from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as directories_utils


class DirectoriesDeleteTestCase(BaseTestGenerator):
    """This class will delete the directories"""
    scenarios = [
        ('Delete multiple directories',
         dict(url='/browser/directory/obj/'))
    ]

    def setUp(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        server_response = server_utils.connect_server(self, self.server_id)
        if server_response["info"] != "Server connected.":
            raise Exception("Could not connect to server to add directory.")
        if "type" in server_response["data"]:
            if server_response["data"]["type"] == "pg":
                message = "directories are not supported by PG."
                self.skipTest(message)
            else:
                if server_response["data"]["version"] < 130000:
                    message = "directories are not supported by EPAS 12 " \
                              "and below."
                    self.skipTest(message)
        self.directory_names = ["test_directory_delete%s" %
                                str(uuid.uuid4())[1:8],
                                "test_directory_delete%s" %
                                str(uuid.uuid4())[1:8]]
        self.directory_paths = ["/home/test_dir", "/home/test_dir1"]
        self.directory_ids = [
            directories_utils.create_directories(
                self.server, self.directory_names[0], self.directory_paths[0]),
            directories_utils.create_directories(
                self.server, self.directory_names[1], self.directory_paths[1])]

    def runTest(self):
        """This function will delete directories."""
        directory_response = directories_utils.verify_directory(
            self.server, self.directory_names[0])
        if not directory_response:
            raise Exception("Could not find the directory to fetch.")

        directory_response = directories_utils.verify_directory(
            self.server, self.directory_names[1])
        if not directory_response:
            raise Exception("Could not find the directory to fetch.")

        data = {'ids': self.directory_ids}
        response = self.tester.delete(
            "{0}{1}/{2}/".format(self.url,
                                 utils.SERVER_GROUP,
                                 self.server_id),
            follow_redirects=True,
            data=json.dumps(data),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        """This function delete the directory from the database."""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        directories_utils.delete_directories(
            connection,
            self.directory_names[0]
        )
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        directories_utils.delete_directories(
            connection,
            self.directory_names[1]
        )
