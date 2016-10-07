# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import uuid

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from regression import parent_node_dict
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from . import utils as tablespace_utils


class TablespaceGetTestCase(BaseTestGenerator):
    """This class tests the get table space scenario"""

    scenarios = [
        # Fetching default URL for roles node.
        ('Check Tablespace Node', dict(url='/browser/tablespace/obj/'))
    ]

    def setUp(self):
        if not self.server['tablespace_path']\
                or self.server['tablespace_path'] is None:
            message = "Tablespace get test case. Tablespace path" \
                      " not configured for server: %s" % self.server['name']
            # Skip the test case if tablespace_path not found.
            self.skipTest(message)
        self.tablespace_name = "tablespace_delete_%s" % str(uuid.uuid4())[1:6]
        self.tablespace_id = tablespace_utils.create_tablespace(
            self.server, self.tablespace_name)
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        tablespace_dict = {"tablespace_id": self.tablespace_id,
                           "tablespace_name": self.tablespace_name,
                           "server_id": self.server_id}
        utils.write_node_info("tsid", tablespace_dict)

    def runTest(self):
        """This function test the get table space scenario"""
        server_response = server_utils.connect_server(self, self.server_id)
        if not server_response['data']['connected']:
            raise Exception("Unable to connect server to get tablespace.")

        tablespace_count = tablespace_utils.verify_table_space(
            self.server, self.tablespace_name)
        if tablespace_count == 0:
            raise Exception("No tablespace(s) to update!!!")
        response = self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.tablespace_id),
            follow_redirects=True)
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """This function delete the tablespace from added server"""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        tablespace_utils.delete_tablespace(connection, self.tablespace_name)
