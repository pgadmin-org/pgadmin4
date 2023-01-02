##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import json

from pgadmin.utils import server_utils
from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils
from . import utils as tablespace_utils


class TableSpaceAddTestCase(BaseTestGenerator):
    """This class will add tablespace node under server"""
    scenarios = [
        # Fetching default URL for tablespace node.
        ('Check Tablespace Node', dict(url='/browser/tablespace/obj/'))
    ]

    def setUp(self):
        self.tablespace_name = ''
        if not self.server['tablespace_path']\
                or self.server['tablespace_path'] is None:
            message = "Tablespace add test case. Tablespace path" \
                      " not configured for server: %s" % self.server['name']
            # Skip the test case if tablespace_path not found.
            self.skipTest(message)

    def runTest(self):
        """This function test the add tablespace API"""
        server_id = parent_node_dict["server"][-1]["server_id"]
        server_response = server_utils.connect_server(self, server_id)
        if not server_response['data']['connected']:
            raise Exception("Unable to connect server to get tablespace.")

        db_owner = server_response['data']['user']['name']
        table_space_path = self.server['tablespace_path']
        data = tablespace_utils.get_tablespace_data(
            table_space_path, db_owner)
        self.tablespace_name = data['name']
        response = self.tester.post(
            self.url + str(utils.SERVER_GROUP) + '/' + str(server_id) + '/',
            data=json.dumps(data),
            content_type='html/json'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        tablespace_id = response_data['node']['_id']
        tablespace_dict = {"tablespace_id": tablespace_id,
                           "tablespace_name": self.tablespace_name,
                           "server_id": server_id}
        utils.write_node_info("tsid", tablespace_dict)

    def tearDown(self):
        """
        This function delete the tablespace from server added in SQLite and
        clears the node_info_dict
        """
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'],
                                             self.server['sslmode'])
        tablespace_utils.delete_tablespace(connection, self.tablespace_name)
