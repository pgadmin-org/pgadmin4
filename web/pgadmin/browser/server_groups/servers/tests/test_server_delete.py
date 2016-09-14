# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################

import json

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from . import utils as server_utils


class ServerDeleteTestCase(BaseTestGenerator):
    """ This class will delete the last server present under tree node."""

    scenarios = [
        # Fetching the default url for server node
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    @classmethod
    def setUpClass(cls):
        """This function add the server to test the DELETE API"""
        server_utils.add_server(cls.server)

    def runTest(self):
        """This function deletes the added server"""
        all_id = utils.get_node_info_dict()
        servers_info = all_id["sid"]
        url = self.url + str(utils.SERVER_GROUP) + "/"

        if len(servers_info) == 0:
            raise Exception("No server to delete!!!")

        # Call API to delete the servers
        server_id = list(servers_info[0].keys())[0]
        response = self.tester.delete(url + str(server_id))
        self.assertEquals(response.status_code, 200)
        response_data = json.loads(response.data.decode('utf-8'))
        self.assertEquals(response_data['success'], 1)

    @classmethod
    def tearDownClass(cls):
        """This function calls the clear_node_info_dict() function to clears
        the node_info_dict"""
        utils.clear_node_info_dict()
