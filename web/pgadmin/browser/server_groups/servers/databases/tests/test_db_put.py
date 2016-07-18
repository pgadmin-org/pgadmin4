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
from regression.test_setup import config_data, advanced_config_data
from regression.test_utils import get_ids, test_getnodes


class DatabasesUpdateTestCase(BaseTestGenerator):
    """
    This class will update the database under last added server.
    """

    scenarios = [
        # Fetching default URL for database node.
        ('Check Databases Node', dict(url='/browser/database/obj/'))
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
        """ This function will update the comments field of database."""

        srv_grp = config_data['test_server_group']
        all_id = get_ids()
        server_ids = all_id["sid"]

        # TODO: Need to modify the code , to delete the databases for all
        # TODO: servers. Currently it delete only one database.
        db_id = all_id["did"][0]
        test_getnodes(self.tester)

        data = {
            "comments": advanced_config_data["test_db_update_data"][0]
            ["test_comment"],
            "id": db_id
        }

        for server_id in server_ids:
            put_response = self.tester.put(self.url + str(srv_grp) + '/' +
                                           str(server_id) + '/' + str(db_id),
                                           data=json.dumps(data),
                                           follow_redirects=True)
            self.assertEquals(put_response.status_code, 200)

    def tearDown(self):
        """
        This function deletes the 'parent_id.pkl' file which is created in
        setup() function. Also this function logout the test client

        :return: None
        """

        utils.delete_server(self.tester)
        utils.delete_parent_id_file()
        utils.logout_tester_account(self.tester)
