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
from regression.test_setup import config_data
from regression.test_utils import get_ids


class ServerDeleteTestCase(BaseTestGenerator):
    """ This class will delete the last server present under tree node."""

    scenarios = [
        # Fetching the default url for server node
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    def setUp(self):
        """
        This function is used to add the server

        :return: None
        """

        # Firstly, add the server
        utils.add_server(self.tester)

    def runTest(self):
        """ This function will get all available servers under object browser
        and delete the last server using server id."""

        srv_grp = config_data['test_server_group']
        all_id = get_ids()
        server_ids = all_id["sid"]

        url = self.url + str(srv_grp) + "/"
        if len(server_ids) == 0:
            raise Exception("No server(s) to delete!!!")

        # Call api to delete the servers
        for server_id in server_ids:
            response = self.tester.delete(url + str(server_id))
            self.assertTrue(response.status_code, 200)
            response_data = json.loads(response.data.decode())
            self.assertTrue(response_data['success'], 1)

    def tearDown(self):
        """
        This function deletes the 'parent_id.pkl' file which is created in
        setup() function.

        :return: None
        """

        utils.delete_parent_id_file()
