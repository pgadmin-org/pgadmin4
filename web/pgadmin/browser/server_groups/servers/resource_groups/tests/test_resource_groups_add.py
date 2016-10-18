# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
import uuid
import json

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from regression import parent_node_dict
from pgadmin.browser.server_groups.servers.tests import utils as server_utils
from . import utils as resource_groups_utils


class ResourceGroupsAddTestCase(BaseTestGenerator):
    """This class will test the add resource groups API"""
    scenarios = [
        ('Add resource groups', dict(url='/browser/resource_group/obj/'))
    ]

    def setUp(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        server_con = server_utils.connect_server(self, self.server_id)
        if not server_con["info"] == "Server connected.":
            raise Exception("Could not connect to server to add resource "
                            "groups.")
        if "server_type" in server_con["data"]:
            if server_con["data"]["server_type"] == "pg":
                message = "Resource groups are not supported by PG."
                self.skipTest(message)

    def runTest(self):
        """This function will add resource groups under server node"""
        self.resource_group = "test_resource_group_add%s" % \
                              str(uuid.uuid4())[1:6]
        data = {"name": self.resource_group,
                "cpu_rate_limit": 0,
                "dirty_rate_limit": 0}
        response = self.tester.post(self.url + str(utils.SERVER_GROUP) +
                                    "/" + str(self.server_id) + "/",
                                    data=json.dumps(data),
                                    content_type='html/json')
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """This function delete the resource group from the database."""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        resource_groups_utils.delete_resource_group(connection,
                                                    self.resource_group)
