##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid

from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as directories_utils


class DirectoriesAddTestCase(BaseTestGenerator):
    """This class will test the add directories API"""
    scenarios = [
        ('Add Directories', dict(url='/browser/directory/obj/'))
    ]

    def setUp(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        server_con = server_utils.connect_server(self, self.server_id)
        if server_con["info"] != "Server connected.":
            raise Exception("Could not connect to server to add directory.")
        if "type" in server_con["data"]:
            if server_con["data"]["type"] == "pg":
                message = "Directories are not supported by PG."
                self.skipTest(message)
            else:
                if server_con["data"]["version"] < 130000:
                    message = "Directories are not supported by EPAS 12" \
                              " and below."
                    self.skipTest(message)

    def runTest(self):
        """This function will add directories under server node"""
        self.directory = "test_directory_add%s" % \
            str(uuid.uuid4())[1:8]
        data = {
            "name": self.directory,
            "path": "/home/test_dir"
        }
        response = self.tester.post(self.url + str(utils.SERVER_GROUP) +
                                    "/" + str(self.server_id) + "/",
                                    data=json.dumps(data),
                                    content_type='html/json')
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        """This function delete the directory from the database."""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        directories_utils.delete_directories(connection, self.directory)
