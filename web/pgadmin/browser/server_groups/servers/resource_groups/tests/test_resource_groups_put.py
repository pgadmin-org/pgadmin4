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


class ResourceGroupsPutTestCase(BaseTestGenerator):
    """This class will update the resource groups"""
    scenarios = [
        ('Put resource groups', dict(url='/browser/resource_group/obj/'))
    ]

    def setUp(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        server_response = server_utils.connect_server(self, self.server_id)
        if not server_response["info"] == "Server connected.":
            raise Exception("Could not connect to server to add resource "
                            "groups.")
        if "server_type" in server_response["data"]:
            if server_response["data"]["server_type"] == "pg":
                message = "Resource groups are not supported by PG."
                self.skipTest(message)
        self.resource_group_name = "test_resource_group_put%s" % \
                                   str(uuid.uuid4())[1:6]
        self.resource_group_id = resource_groups_utils.create_resource_groups(
            self.server, self.resource_group_name)

    def runTest(self):
        """This function will get the resource groups."""
        resource_grp_response = resource_groups_utils.verify_resource_group(
            self.server, self.resource_group_name)
        if not resource_grp_response:
            raise Exception("Could not find the resource group to fetch.")
        self.resource_group_name = "test_resource_group_put%s" % \
                                   str(uuid.uuid4())[1:6]
        data = {"id": self.resource_group_id,
                "name": self.resource_group_name}
        response = self.tester.put('{0}{1}/{2}/{3}'.format(
            self.url, utils.SERVER_GROUP, self.server_id,
            self.resource_group_id), data=json.dumps(data),
            follow_redirects=True)
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """This function delete the resource group from the database."""
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        resource_groups_utils.delete_resource_group(connection,
                                                    self.resource_group_name)
