##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from . import utils as servers_utils


class ServerDeleteTestCase(BaseTestGenerator):
    """ This class will delete the last server present under tree node."""

    scenarios = utils.generate_scenarios('delete_server',
                                         servers_utils.test_cases)

    def setUp(self):
        """This function add the server to test the DELETE API"""
        self.server_id = utils.create_server(self.server)
        server_dict = {"server_id": self.server_id}
        utils.write_node_info("sid", server_dict)

    def runTest(self):
        """This function deletes the added server"""
        url = self.url + str(utils.SERVER_GROUP) + "/"
        if not self.server_id:
            raise Exception("No server to delete!!!")
        # Call API to delete the servers
        response = self.tester.delete(url + str(self.server_id))
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        """This function delete the server from SQLite """
        utils.delete_server_with_api(self.tester, self.server_id)
