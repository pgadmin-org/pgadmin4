# #################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# ##################################################################
from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils


class ServerDeleteTestCase(BaseTestGenerator):
    """ This class will delete the last server present under tree node."""

    scenarios = [
        # Fetching the default url for server node
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

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
        self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """This function delete the server from SQLite """
        utils.delete_server_with_api(self.tester, self.server_id)
