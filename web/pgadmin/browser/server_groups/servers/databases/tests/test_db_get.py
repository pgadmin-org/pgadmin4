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
from regression.test_setup import config_data
from regression.test_utils import get_ids, test_getnodes


class DatabasesGetTestCase(BaseTestGenerator):
    """
    This class will fetch database added under last added server.
    """

    scenarios = [
        # Fetching default URL for database node.
        ('Check Databases Node URL', dict(url='/browser/database/obj/'))
    ]

    def setUp(self):
        """
        This function perform the three tasks
         1. Login to test client
         2. Add the test server
         3. Connect to server

        :return: None
        """

        utils.login_tester_account(self.tester)
        # Firstly, add the server
        utils.add_server(self.tester)
        # Secondly, connect to server/database
        utils.connect_server(self.tester)

    def runTest(self):
        """ This function will fetch added database. """

        all_id = get_ids()
        server_ids = all_id["sid"]

        # TODO: Code is remaining to get all databases of all servers
        self.db_id = all_id["did"][0]
        srv_grp = config_data['test_server_group']

        for server_id in server_ids:
            db_con = test_getnodes(self.tester)
            if db_con["info"] == "Database connected.":
                response = self.tester.get(self.url + str(srv_grp) + '/' +
                                           str(server_id) + '/' + str(
                    self.db_id),
                                           follow_redirects=True)
                self.assertEquals(response.status_code, 200)

    def tearDown(self):
        """
        This function deletes the 'parent_id.pkl' file which is created in
        setup() function. Also this function logout the test client

        :return: None
        """

        utils.delete_database(self.tester, self.db_id)
        utils.delete_server(self.tester)
        utils.delete_parent_id_file()
        utils.logout_tester_account(self.tester)
